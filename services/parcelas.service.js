import fs from "fs/promises";
import path from "path";
import fetch from "node-fetch";

const CACHE_DIR = path.resolve("./cache");
const CACHE_FILE = path.join(CACHE_DIR, "parcelas-cache.json");

const TTL_HOURS = Number(process.env.PARCELAS_CACHE_TTL_HOURS || 24);
const TTL_MS = TTL_HOURS * 60 * 60 * 1000;

let parcelasMemoria = null;
let parcelasMeta = {
    updatedAt: null,
    source: null,
};

let refreshRunning = false;

function isExpired(updatedAt) {
    if (!updatedAt) return true;
    return Date.now() - new Date(updatedAt).getTime() > TTL_MS;
}

async function ensureCacheDir() {
    await fs.mkdir(CACHE_DIR, { recursive: true });
}

async function readCacheFile() {
    const raw = await fs.readFile(CACHE_FILE, "utf8");
    return JSON.parse(raw);
}

async function writeCacheFile(data) {
    await ensureCacheDir();

    const payload = {
        updatedAt: new Date().toISOString(),
        data,
    };

    await fs.writeFile(CACHE_FILE, JSON.stringify(payload, null, 2), "utf8");

    parcelasMemoria = data;
    parcelasMeta = {
        updatedAt: payload.updatedAt,
        source: "api",
    };

    return payload;
}

function validateParcelasPayload(payload) {
    if (!payload || typeof payload !== "object") {
        throw new Error("Payload inválido: resposta vazia ou não é objeto");
    }

    if (!payload.projetos || !Array.isArray(payload.projetos)) {
        throw new Error("Payload inválido: campo 'projetos' ausente ou inválido");
    }

    if (!payload.dados || typeof payload.dados !== "object") {
        throw new Error("Payload inválido: campo 'dados' ausente ou inválido");
    }

    return true;
}

async function fetchParcelasFromApi() {
    const url = process.env.PARCELAS_API_URL;
    const token = process.env.NODE_APP_DJANGO_TOKEN;

    if (!url) {
        throw new Error("PARCELAS_API_URL não configurada");
    }

    if (!token) {
        throw new Error("NODE_APP_DJANGO_TOKEN não configurado");
    }

    const response = await fetch(url, {
        method: "GET",
        headers: {
            Accept: "application/json",
            Authorization: `Token ${token}`,
        },
    });

    if (!response.ok) {
        const body = await response.text();
        throw new Error(`Erro ao buscar parcelas: ${response.status} - ${body}`);
    }

    const json = await response.json();
    validateParcelasPayload(json);

    return json;
}

async function refreshInBackgroundIfNeeded() {
    if (refreshRunning) return;
    if (!parcelasMeta.updatedAt || !isExpired(parcelasMeta.updatedAt)) return;

    refreshRunning = true;

    try {
        const fresh = await fetchParcelasFromApi();
        await writeCacheFile(fresh);
        console.log("[parcelas] cache atualizado em background");
    } catch (error) {
        console.log("[parcelas] erro no refresh em background:", error.message);
    } finally {
        refreshRunning = false;
    }
}

export async function initParcelasCache() {
    try {
        const cached = await readCacheFile();
        validateParcelasPayload(cached.data);

        parcelasMemoria = cached.data;
        parcelasMeta = {
            updatedAt: cached.updatedAt,
            source: "disk",
        };

        if (isExpired(cached.updatedAt)) {
            try {
                const fresh = await fetchParcelasFromApi();
                await writeCacheFile(fresh);
                console.log("[parcelas] cache atualizado no boot");
            } catch (error) {
                console.log("[parcelas] falha ao atualizar no boot, usando cache local:", error.message);
            }
        }

        return parcelasMemoria;
    } catch (diskError) {
        console.log("[parcelas] cache local ausente/inválido, buscando API...");

        const fresh = await fetchParcelasFromApi();
        await writeCacheFile(fresh);
        return fresh;
    }
}

export async function getParcelasData() {
    if (parcelasMemoria) {
        refreshInBackgroundIfNeeded();
        return parcelasMemoria;
    }

    const cached = await readCacheFile();
    validateParcelasPayload(cached.data);

    parcelasMemoria = cached.data;
    parcelasMeta = {
        updatedAt: cached.updatedAt,
        source: "disk",
    };

    refreshInBackgroundIfNeeded();
    return parcelasMemoria;
}

export async function refreshParcelasData() {
    const fresh = await fetchParcelasFromApi();
    await writeCacheFile(fresh);

    return {
        ok: true,
        updatedAt: parcelasMeta.updatedAt,
        totalProjetos: fresh.projetos?.length || 0,
        totalProjetosDados: Object.keys(fresh.dados || {}).length,
        data: fresh,
    };
}

export function getParcelasMeta() {
    return {
        ...parcelasMeta,
        ttlHours: TTL_HOURS,
        data: parcelasMemoria,
    };
}