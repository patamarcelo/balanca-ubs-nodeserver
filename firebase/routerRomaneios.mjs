import express from "express";
import { getDocsFire } from "./actions.js";

import { collection, addDoc, doc, updateDoc, getDoc } from "firebase/firestore";
import { TABLES_FIREBASE } from "./firebase.typestables.js";
import { db } from "./firebase.js";

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
			error: "Sem Permissão"
		});
	}
}
// router.use((req,res,next) => {
//     const auth = true
//     if(!auth){
//         return res.status(401).json({
//             error: 'usuário não está autorizado'
//         })
//     }
//     next()
// })

router.get("/", isAuth, async (req, res) => {
	try {
		const data = await getDocsFire();
		// console.log('pegando os dados: ', data.length)
		res.send(data).status(200);
	} catch (error) {
		console.log("Error : ", error);
	}
});

router.post("/upload-romaneio", isAuth, async (req, res) => {
	const dataId = await req.body.id;
	const docRef = doc(db, TABLES_FIREBASE.truckmove, dataId);
	const docSend = await getDoc(docRef);
	const docSendData = docSend.data();

	const parcelasObjFiltered = [
		{
			variedade: "424",
			colheita: false,
			safra: "2023/2024",
			ciclo: 3,
			caixas: 4,
			cultura: "Arroz",
			parcela: "A01",
			id_plantio: 8792
		},
		{
			variedade: "424",
			colheita: false,
			safra: "2023/2024",
			ciclo: 3,
			caixas: 4,
			cultura: "Arroz",
			parcela: "A01",
			id_plantio: 8792
		}
	];

	let formatSendData = {};
	if (!docSendData) {
		res.status(404).send(`Documento não encontrando: ${dataId}`);
	} else {
		const getData = docSendData.parcelasObjFiltered;
		console.log("getData: ", getData);
		const exist = (data) => data.caixas === undefined || data.caixas === 0;
		const som0eUndefined = getData.some(exist);

		if (som0eUndefined) {
			const totalLen = getData.length;
			let adjustPercent;

			if (totalLen % 2 !== 0 && getData.length > 1) {
				let total = 0;
				adjustPercent = getData.map((data, i) => {
					let parcePercent;
					if (i + 1 === getData.length) {
						console.log("último elemento", data);
						parcePercent = Number(100 - total);
					} else {
						parcePercent = ((1 / totalLen) * 100).toFixed(0);
						total += Number(parcePercent);
					}
					return { ...data, parcePercent: Number(parcePercent) };
				});

				formatSendData = {
					...docSendData,
					parcelasObjFiltered: adjustPercent
				};
			} else {
				const adjustPercent = getData.map((data, i) => {
					const parcePercent = ((1 / totalLen) * 100).toFixed(0);

					return { ...data, parcePercent: Number(parcePercent) };
				});

				formatSendData = {
					...docSendData,
					parcelasObjFiltered: adjustPercent
				};

				console.log("adjust PercentHereL ", adjustPercent);
			}
		} else {
			const totalCaixas = getData.reduce(
				(acc, curr) => acc + curr.caixas,
				0
			);
			const adjustPercent = getData.map((data) => {
				const parcePercent = (
					(data.caixas / totalCaixas) *
					100
				).toFixed(2);
				return { ...data, parcePercent: Number(parcePercent) };
			});
			console.log("adjust PercentHereL ", adjustPercent);
			formatSendData = {
				...docSendData,
				parcelasObjFiltered: adjustPercent
			};
		}

		const response = {
			...formatSendData,
			id: dataId
		};

		console.log("response", response);
		res.send(response).status(200);
	}
});
router.post("/update-romaneio-from-protheus", async (req, res) => {
	const data = await req.body;

	try {
		const docRef = doc(db, TABLES_FIREBASE.truckmove, data.id);
		const oldDoc = await getDoc(docRef);
		const oldDocData = oldDoc.data();

		let pesoBruto = "";
		let pesoTara = "";
		let pesoLiquido = "";
		let saida = "";

		if (Number(oldDocData.pesoBruto) > 0) {
			console.log("old Peso Bruto: ", oldDocData.pesoBruto);
			pesoBruto = Number(oldDocData.pesoBruto);
		} else if (Number(data.pesoBruto) > 0) {
			pesoBruto = Number(data.pesoBruto);
		}

		if (Number(oldDocData.tara) > 0) {
			console.log("old Peso Tara: ", oldDocData.tara);
			pesoTara = Number(oldDocData.tara);
		} else if (Number(data.pesoTara) > 0) {
			pesoTara = Number(data.pesoTara);
		}

		if (Number(pesoTara) > 0 && Number(pesoBruto) > 0) {
			pesoLiquido = pesoBruto - pesoTara;
			saida = new Date();
		}

		const updates = {
			...(Number(pesoTara) > 0 && { tara: pesoTara }),
			...(Number(pesoBruto) > 0 && { pesoBruto: pesoBruto }),
			...(Number(pesoLiquido) > 0 && { liquido: pesoLiquido }),
			...(Number(pesoLiquido) > 0 && { saida: saida })
		};

		const result = await updateDoc(docRef, updates);
		const updatedDoc = await getDoc(docRef);
		const newDoc = updatedDoc.data();
		res.send(newDoc).status(200);
	} catch (err) {
		res.send("Erro ao alterar os pesos: ", err).status(400);
	}
});

export default router;
