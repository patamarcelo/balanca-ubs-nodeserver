import express from "express";
import { getAuth } from "firebase-admin/auth";

const router = express.Router();

function isAuth(req, res, next) {
	if (
		req.headers.authorization ===
		"Token " + process.env.NODE_APP_DJANGO_TOKEN
	) {
		console.log("usuário permitido");
		next();
	} else {
		return res.status(401).json({
			success: false,
			error: "Sem Permissão",
		});
	}
}

function normalizePhone(phone) {
	if (!phone) return undefined;

	const cleaned = String(phone)
		.replace(/\s/g, "")
		.replace(/-/g, "")
		.replace(/\(/g, "")
		.replace(/\)/g, "");

	if (!cleaned) return undefined;

	return cleaned.startsWith("+") ? cleaned : `+${cleaned}`;
}

function sanitizeUser(userRecord) {
	const user = userRecord.toJSON();

	return {
		uid: user.uid,
		email: user.email || "",
		emailVerified: !!user.emailVerified,
		displayName: user.displayName || "",
		phoneNumber: user.phoneNumber || "",
		photoURL: user.photoURL || "",
		disabled: !!user.disabled,
		metadata: user.metadata || {},
		customClaims: user.customClaims || {},
		tokensValidAfterTime: user.tokensValidAfterTime || null,
		providerData: user.providerData || [],
	};
}

function sanitizeClaimsPayload(payload = {}) {
	const allowedClaims = {};

	if (typeof payload.admin === "boolean") {
		allowedClaims.admin = payload.admin;
	}

	if (typeof payload.isActive === "boolean") {
		allowedClaims.isActive = payload.isActive;
	}

	if (typeof payload.isBalanca === "boolean") {
		allowedClaims.isBalanca = payload.isBalanca;
	}

	if (typeof payload.isDefensivos === "boolean") {
		allowedClaims.isDefensivos = payload.isDefensivos;
	}

	if (typeof payload.isVendas === "boolean") {
		allowedClaims.isVendas = payload.isVendas;
	}

	if (typeof payload.unidadeOp === "string") {
		allowedClaims.unidadeOp = payload.unidadeOp;
	}

	if (typeof payload.category === "string") {
		allowedClaims.category = payload.category;
	}

	if (Array.isArray(payload.projetosLiberados)) {
		allowedClaims.projetosLiberados = payload.projetosLiberados
			.filter((item) => typeof item === "string")
			.map((item) => item.trim())
			.filter(Boolean);
	}

	return allowedClaims;
}

async function getUserByUidOrEmail({ uid, email }) {
	if (uid) {
		return await getAuth().getUser(uid);
	}

	if (email) {
		return await getAuth().getUserByEmail(email);
	}

	throw new Error("Informe uid ou email.");
}

router.post("/check-user", async (req, res) => {
	try {
		const { uid } = req.body;

		if (!uid) {
			return res.status(400).json({
				success: false,
				code: "UID_REQUIRED",
				message: "UID is required",
			});
		}

		console.log("uid: ", uid);

		const userRecord = await getAuth().getUser(uid);
		const user = sanitizeUser(userRecord);

		if (user.disabled) {
			return res.status(403).json({
				success: false,
				code: "USER_DISABLED",
				message: "Usuário desativado.",
				user,
			});
		}

		return res.status(200).json({
			success: true,
			code: "USER_ACTIVE",
			message: "Usuário ativo.",
			user,
		});
	} catch (error) {
		console.error("Error fetching user data:", error);

		if (error?.code === "auth/user-not-found") {
			return res.status(404).json({
				success: false,
				code: "USER_NOT_FOUND",
				message: "Usuário não existe.",
			});
		}

		return res.status(500).json({
			success: false,
			code: "INTERNAL_SERVER_ERROR",
			error: "Internal Server Error",
			message: error.message,
		});
	}
});


router.get("/get-all-users", isAuth, async (req, res) => {
	try {
		const allUsers = [];
		let nextPageToken;

		do {
			const listUsersResult = await getAuth().listUsers(1000, nextPageToken);

			listUsersResult.users.forEach((userRecord) => {
				allUsers.push(sanitizeUser(userRecord));
			});

			nextPageToken = listUsersResult.pageToken;
		} while (nextPageToken);

		console.log("total users: ", allUsers.length);

		return res.status(200).json({
			success: true,
			total: allUsers.length,
			data: allUsers,
		});
	} catch (error) {
		console.error("Error fetching users:", error);

		return res.status(500).json({
			success: false,
			message: "Failed to fetch users",
			error: error.message,
		});
	}
});

router.get("/get-user/:uid", isAuth, async (req, res) => {
	try {
		const { uid } = req.params;

		const userRecord = await getAuth().getUser(uid);

		return res.status(200).json({
			success: true,
			data: sanitizeUser(userRecord),
		});
	} catch (error) {
		console.error("Error fetching user:", error);

		return res.status(500).json({
			success: false,
			message: "Failed to fetch user",
			error: error.message,
		});
	}
});

router.post("/create-user", isAuth, async (req, res) => {
	try {
		const {
			email,
			phoneNumber,
			password,
			displayName,
			emailVerified = false,
			disabled = false,
			customClaims = {},
		} = req.body;

		if (!email) {
			return res.status(400).json({
				success: false,
				message: "E-mail é obrigatório.",
			});
		}

		if (!password) {
			return res.status(400).json({
				success: false,
				message: "Senha é obrigatória.",
			});
		}

		if (!displayName) {
			return res.status(400).json({
				success: false,
				message: "Nome é obrigatório.",
			});
		}

		const createPayload = {
			email,
			emailVerified,
			password,
			displayName,
			disabled,
		};

		const normalizedPhone = normalizePhone(phoneNumber);

		if (normalizedPhone) {
			createPayload.phoneNumber = normalizedPhone;
		}

		const userRecord = await getAuth().createUser(createPayload);

		const cleanClaims = sanitizeClaimsPayload({
			admin: false,
			isActive: !disabled,
			isBalanca: false,
			isDefensivos: false,
			isVendas: false,
			category: "admin",
			projetosLiberados: [],
			...customClaims,
		});

		await getAuth().setCustomUserClaims(userRecord.uid, cleanClaims);

		const updatedUser = await getAuth().getUser(userRecord.uid);

		return res.status(201).json({
			success: true,
			message: "Usuário criado com sucesso.",
			data: sanitizeUser(updatedUser),
		});
	} catch (error) {
		console.error("Error creating user:", error);

		return res.status(500).json({
			success: false,
			message: "Erro ao criar usuário.",
			error: error.message,
		});
	}
});

router.patch("/update-user/:uid", isAuth, async (req, res) => {
	try {
		const { uid } = req.params;
		const {
			email,
			phoneNumber,
			displayName,
			emailVerified,
			disabled,
		} = req.body;

		const updatePayload = {};

		if (typeof email === "string") {
			updatePayload.email = email;
		}

		if (typeof displayName === "string") {
			updatePayload.displayName = displayName;
		}

		if (typeof emailVerified === "boolean") {
			updatePayload.emailVerified = emailVerified;
		}

		if (typeof disabled === "boolean") {
			updatePayload.disabled = disabled;
		}

		if (phoneNumber === null || phoneNumber === "") {
			updatePayload.phoneNumber = null;
		} else if (typeof phoneNumber === "string") {
			updatePayload.phoneNumber = normalizePhone(phoneNumber);
		}

		await getAuth().updateUser(uid, updatePayload);

		const updatedUser = await getAuth().getUser(uid);

		return res.status(200).json({
			success: true,
			message: "Usuário atualizado com sucesso.",
			data: sanitizeUser(updatedUser),
		});
	} catch (error) {
		console.error("Error updating user:", error);

		return res.status(500).json({
			success: false,
			message: "Erro ao atualizar usuário.",
			error: error.message,
		});
	}
});

router.patch("/update-password/:uid", isAuth, async (req, res) => {
	try {
		const { uid } = req.params;
		const { password } = req.body;

		if (!password || String(password).length < 6) {
			return res.status(400).json({
				success: false,
				message: "A senha precisa ter pelo menos 6 caracteres.",
			});
		}

		await getAuth().updateUser(uid, {
			password,
		});

		await getAuth().revokeRefreshTokens(uid);

		return res.status(200).json({
			success: true,
			message: "Senha atualizada com sucesso. Tokens antigos foram revogados.",
		});
	} catch (error) {
		console.error("Error updating password:", error);

		return res.status(500).json({
			success: false,
			message: "Erro ao alterar senha.",
			error: error.message,
		});
	}
});

router.patch("/update-claims/:uid", isAuth, async (req, res) => {
	try {
		const { uid } = req.params;
		const { customClaims = {}, replace = false } = req.body;

		const userRecord = await getAuth().getUser(uid);
		const currentClaims = userRecord.customClaims || {};
		const cleanClaims = sanitizeClaimsPayload(customClaims);

		const nextClaims = replace
			? cleanClaims
			: {
					...currentClaims,
					...cleanClaims,
			  };

		await getAuth().setCustomUserClaims(uid, nextClaims);

		if (typeof nextClaims.isActive === "boolean") {
			await getAuth().updateUser(uid, {
				disabled: !nextClaims.isActive,
			});
		}

		const updatedUser = await getAuth().getUser(uid);

		return res.status(200).json({
			success: true,
			message: "Custom claims atualizadas com sucesso.",
			data: sanitizeUser(updatedUser),
		});
	} catch (error) {
		console.error("Error updating claims:", error);

		return res.status(500).json({
			success: false,
			message: "Erro ao atualizar custom claims.",
			error: error.message,
		});
	}
});

router.patch("/set-disabled/:uid", isAuth, async (req, res) => {
	try {
		const { uid } = req.params;
		const { disabled } = req.body;

		if (typeof disabled !== "boolean") {
			return res.status(400).json({
				success: false,
				message: "O campo disabled precisa ser boolean.",
			});
		}

		const userRecord = await getAuth().getUser(uid);
		const currentClaims = userRecord.customClaims || {};

		const nextClaims = {
			...currentClaims,
			isActive: !disabled,
		};

		await getAuth().updateUser(uid, {
			disabled,
		});

		await getAuth().setCustomUserClaims(uid, nextClaims);

		if (disabled) {
			await getAuth().revokeRefreshTokens(uid);
		}

		const updatedUser = await getAuth().getUser(uid);

		return res.status(200).json({
			success: true,
			message: disabled
				? "Usuário desativado com sucesso."
				: "Usuário ativado com sucesso.",
			data: sanitizeUser(updatedUser),
		});
	} catch (error) {
		console.error("Error changing user status:", error);

		return res.status(500).json({
			success: false,
			message: "Erro ao alterar status do usuário.",
			error: error.message,
		});
	}
});

router.post("/revoke-refresh-tokens/:uid", isAuth, async (req, res) => {
	try {
		const { uid } = req.params;

		await getAuth().revokeRefreshTokens(uid);

		const updatedUser = await getAuth().getUser(uid);

		return res.status(200).json({
			success: true,
			message: "Sessões revogadas com sucesso.",
			data: sanitizeUser(updatedUser),
		});
	} catch (error) {
		console.error("Error revoking tokens:", error);

		return res.status(500).json({
			success: false,
			message: "Erro ao revogar sessões.",
			error: error.message,
		});
	}
});

router.delete("/delete-user/:uid", isAuth, async (req, res) => {
	try {
		const { uid } = req.params;
		const { confirm } = req.body;

		if (confirm !== true) {
			return res.status(400).json({
				success: false,
				message: "Para excluir o usuário, envie confirm: true.",
			});
		}

		await getAuth().deleteUser(uid);

		return res.status(200).json({
			success: true,
			message: "Usuário excluído com sucesso.",
			uid,
		});
	} catch (error) {
		console.error("Error deleting user:", error);

		return res.status(500).json({
			success: false,
			message: "Erro ao excluir usuário.",
			error: error.message,
		});
	}
});

export default router;