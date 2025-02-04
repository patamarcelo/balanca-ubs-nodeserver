import express from "express";
import { getDocsFire } from "./actions.js";

import { collection, addDoc, doc, updateDoc, getDoc, writeBatch } from "firebase/firestore";
import { TABLES_FIREBASE } from "./firebase.typestables.js";
import { db } from "./firebase.js";

import { getAndGenerateIdFirebase, getAndGenerateIdFirebaseBeforeLast } from "./utils.js";

import fetch from "node-fetch";
import https from 'https'

import dataParcelas from './parcelas.js'
const { projetos, dados } = dataParcelas


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
	const lastOne = await getAndGenerateIdFirebase(10);
	console.log('last one')
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
	let docSendData = docSend.data();
	
	const newParcelas = docSendData?.parcelasObjFiltered?.map((data) => data.parcela)
	const variedadeCultura = docSendData?.parcelasObjFiltered.map((data) => {
		return ({
			cultura: data.cultura,
			variedade: data.variedade
		})
	})

	docSendData = {
		...docSendData, 
		parcelasNovas: newParcelas,
		mercadoria: variedadeCultura[0]?.variedade,
		cultura: variedadeCultura[0]?.cultura
	}

	const updateParcelasNovas = {
		parcelasNovas: newParcelas,
		mercadoria: variedadeCultura[0]?.variedade,
		cultura: variedadeCultura[0]?.cultura
	}
	
	const resultParcelasNovas = await updateDoc(docRef, updateParcelasNovas);
	console.log("reult of update parcelasNovas: ", resultParcelasNovas);

	if (docSendData.parcelasNovas.length === 1) {
		const parcela = docSendData.parcelasNovas[0]
		const newParcelaObj = dados[docSendData.fazendaOrigem][parcela]
		const newAdjust = { ...newParcelaObj, parcela }
		docSendData = { ...docSendData, parcelasObjFiltered: [newAdjust] }
	} else {
		console.log('mais de 1 parcela')
		// logic here to handle when update value of obj comparing two arrays and if it is diff
		const one = docSendData.parcelasNovas
		console.log('Parcelas Novas: ', one)
		const two = docSendData.parcelasObjFiltered.map((data) => data.parcela)
		console.log('parcelasObjFilt', two)

		// // Sort both arrays
		const sortedOne = one.sort((a, b) => a.localeCompare(b))
		const sortedTwo = two.sort((a, b) => a.localeCompare(b));

		// // Convert arrays to strings and compare them
		const stringOne = sortedOne.toString();
		const stringTwo = sortedTwo.toString();

		// // Check if the strings are equal
		const areEqual = stringOne === stringTwo;

		if (areEqual) {
			console.log("The arrays contain the same elements.");
		} else {
			console.log("Os Arrays Enviados não são iguais, vamos corrigilos...");
			const newArrayToAdd = []
			one.forEach(element => {
				const getCorretObjs = dados[docSendData.fazendaOrigem][element]
				newArrayToAdd.push({ ...getCorretObjs, parcela: element })
			});
			docSendData = { ...docSendData, parcelasObjFiltered: newArrayToAdd }
		}
	}




	const lastOne = await getAndGenerateIdFirebase();
	// lastOne.forEach((e) => {
	// 	console.log('últimos ROmaneios: ', e.relatorioColheita, e.syncDate.toDate().toLocaleTimeString())
	// })

	let formatSendData = {};
	if (!docSendData) {
		res.status(404).send(`Documento não encontrando: ${dataId}`);
	} else {
		const getData = docSendData.parcelasObjFiltered;
		console.log("getData: ", getData);
		const exist = data => data.caixas === undefined || data.caixas === 0;
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
						parcePercent = (1 / totalLen * 100).toFixed(0);
						total += Number(parcePercent);
					}
					return { ...data, parcePercent: Number(parcePercent) };
				});

				formatSendData = {
					...docSendData,
					parcelasObjFiltered: adjustPercent
				};


				const updates = {
					parcelasObjFiltered: adjustPercent
				};
				const result = await updateDoc(docRef, updates);

			} else {
				const adjustPercent = getData.map((data, i) => {
					const parcePercent = (1 / totalLen * 100).toFixed(0);

					return { ...data, parcePercent: Number(parcePercent) };
				});

				formatSendData = {
					...docSendData,
					parcelasObjFiltered: adjustPercent
				};

				console.log("adjust PercentHereL ", adjustPercent);
				const updates = {
					parcelasObjFiltered: adjustPercent
				};
				const result = await updateDoc(docRef, updates);
			}
		} else {
			const totalCaixas = getData.reduce((acc, curr) => acc + curr.caixas, 0);
			const adjustPercent = getData.map(data => {
				const parcePercent = (data.caixas / totalCaixas * 100).toFixed(2);
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

		let newNumber;
		// AJUSTE PARA REGULAR O NUMERO DO ROMANEIO
		console.log("response :", response.relatorioColheita);
		console.log("lastNumber :", lastOne.relatorioColheita);

		if (process.env.NODE_ENV === "production") {
			console.log('estamos na producao')
			if (
				Number(response.relatorioColheita) == Number(lastOne.relatorioColheita)
			) {
				console.log(
					"tudo certo, romaneio registrado corretamente com o número : ",
					response.relatorioColheita
				);
				newNumber = Number(response.relatorioColheita);
			} else {
				console.log("Gerando os últimos resultados de romaneios, para ajustar o número")
				const beforelastOne = await getAndGenerateIdFirebaseBeforeLast();
				const newNumberAdjust = Number(beforelastOne.relatorioColheita) + 1;
				console.log("novo número Ajustado", newNumberAdjust);
				const updates = {
					relatorioColheita: newNumberAdjust
				};
				const result = await updateDoc(docRef, updates);
				console.log('reult of Serverhandler: ', result)
				newNumber = newNumberAdjust;
			}
		} else {
			console.log('estamos na desenvolvimento')
		}


		if (process.env.NODE_ENV !== "production") {
			newNumber = response.relatorioColheita
		}


		// AJUSTE PARA INCLUIR ID DO PROJETO
		const getProjName = (data) => data.nome === response.fazendaOrigem
		const newData = projetos.find(getProjName)
		if (newData) {
			console.log('Projeto Origem : ', newData?.nome)
			console.log('Projeto Origem id: ', newData?.id_d)
			const updates = {
				fazendaOrigemProtheusId: newData?.id_d
			};

			const result = await updateDoc(docRef, updates);
			console.log("reult of Serverhandler: ", result);
		}


		// AJUSTE PARA REGULAR O NUMERO DO ROMANEIO
		const responseToSend = {
			...response,
			relatorioColheita: newNumber,
			fazendaOrigemProtheusId: newData?.id_d

		};

		//response OBJ TO SEND TO PROTHEUS
		res.send(responseToSend).status(200);

		console.log('Dados enviados ao Protheus: ', responseToSend)

		try {
			const httpsAgent = new https.Agent({
				rejectUnauthorized: false,
			});
			var requestOptions = {
				method: "POST",
				headers: {
					Accept: "application/json",
					"Content-Type": "application/json",
					Authorization: `Basic ${process.env.NODE_APP_PROTHEUS_TOKEN}`,
					"Access-Control-Allow-Origin": "*"
				},
				body: JSON.stringify(responseToSend),
				redirect: "follow",
				agent: httpsAgent,
			};

			const repsonseFromProtheus = await fetch(
				"https://api.diamanteagricola.com.br:8089/rest/TICKETAPI/attTicket/",
				requestOptions
			);
			const dataFrom = await repsonseFromProtheus.json()
			console.log("resposta do Protheus", repsonseFromProtheus.status)
			console.log('resposta do Protheus', dataFrom)
			if (repsonseFromProtheus.status !== 201) {
				console.log('Erro ao salvar os dados no Protheus, ')
				return
			}
		} catch (error) {
			console.log("Erro ao enviar os dados para o protheus", error);
		}

		if (response.codTicketPro) {
			const forTicket = parseInt(response.codTicketPro);

			const updates = {
				ticket: forTicket
			};

			const result = await updateDoc(docRef, updates);
			console.log("reult of Serverhandler: ", result);
		}


	}
});

router.post("/updated-romaneio-data", isAuth, async (req, res) => {
	console.log('Editando o documento pela nova opção do sistema, direto para o protheus')
	const dataId = await req.body.id;
	const docRef = doc(db, TABLES_FIREBASE.truckmove, dataId);
	const docSend = await getDoc(docRef);
	let docSendData = docSend.data();
	if (!docSendData) {
		console.log('documento não encontrado: ', dataId)
	} else {
		if (docSendData?.parcelasNovas.length === 1) {
			const parcela = docSendData.parcelasNovas[0]
			const newParcelaObj = dados[docSendData.fazendaOrigem][parcela]
			const newAdjust = { ...newParcelaObj, parcela }
			docSendData = { ...docSendData, parcelasObjFiltered: [newAdjust] }
		} else {
			console.log('mais de 1 parcela')
			// logic here to handle when update value of obj comparing two arrays and if it is diff
			const one = docSendData?.parcelasNovas
			console.log('Parcelas Novas: ', one)
			const two = docSendData.parcelasObjFiltered.map((data) => data.parcela)
			console.log('parcelasObjFilt', two)

			// // Sort both arrays
			const sortedOne = one.sort((a, b) => a.localeCompare(b))
			const sortedTwo = two.sort((a, b) => a.localeCompare(b));

			// // Convert arrays to strings and compare them
			const stringOne = sortedOne.toString();
			const stringTwo = sortedTwo.toString();

			// // Check if the strings are equal
			const areEqual = stringOne === stringTwo;

			if (areEqual) {
				console.log("The arrays contain the same elements.");
			} else {
				console.log("Os Arrays Enviados não são iguais, vamos corrigilos...");
				const newArrayToAdd = []
				one.forEach(element => {
					const getCorretObjs = dados[docSendData.fazendaOrigem][element]
					newArrayToAdd.push({ ...getCorretObjs, parcela: element })
				});
				docSendData = { ...docSendData, parcelasObjFiltered: newArrayToAdd }
			}
		}
	}


	let formatSendData = {};
	if (!docSendData) {
		res.status(404).send(`Documento não encontrando: ${dataId}`);
	} else {
		const getData = docSendData.parcelasObjFiltered;
		console.log("getData: ", getData);
		const exist = data => data.caixas === undefined || data.caixas === 0;
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
						parcePercent = (1 / totalLen * 100).toFixed(0);
						total += Number(parcePercent);
					}
					return { ...data, parcePercent: Number(parcePercent) };
				});

				formatSendData = {
					...docSendData,
					parcelasObjFiltered: adjustPercent
				};


				const updates = {
					parcelasObjFiltered: adjustPercent
				};
				const result = await updateDoc(docRef, updates);

			} else {
				const adjustPercent = getData.map((data, i) => {
					const parcePercent = (1 / totalLen * 100).toFixed(0);

					return { ...data, parcePercent: Number(parcePercent) };
				});

				formatSendData = {
					...docSendData,
					parcelasObjFiltered: adjustPercent
				};

				console.log("adjust PercentHereL ", adjustPercent);
				const updates = {
					parcelasObjFiltered: adjustPercent
				};
				const result = await updateDoc(docRef, updates);
			}
		} else {
			const totalCaixas = getData.reduce((acc, curr) => acc + curr.caixas, 0);
			const adjustPercent = getData.map(data => {
				const parcePercent = (data.caixas / totalCaixas * 100).toFixed(2);
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

		// AJUSTE PARA INCLUIR ID DO PROJETO
		const getProjName = (data) => data.nome === response.fazendaOrigem
		const newData = projetos.find(getProjName)
		if (newData) {
			console.log('Projeto Origem : ', newData?.nome)
			console.log('Projeto Origem id: ', newData?.id_d)
			const updates = {
				fazendaOrigemProtheusId: newData?.id_d
			};

			const result = await updateDoc(docRef, updates);
			console.log("reult of Serverhandler: ", result);
		}


		// AJUSTE PARA REGULAR O NUMERO DO ROMANEIO
		const responseToSend = {
			...response,
			fazendaOrigemProtheusId: newData?.id_d

		};

		//response OBJ TO SEND TO PROTHEUS
		res.send(responseToSend).status(200);

		try {
			const httpsAgent = new https.Agent({
				rejectUnauthorized: false,
			});
			var requestOptions = {
				method: "POST",
				headers: {
					Accept: "application/json",
					"Content-Type": "application/json",
					Authorization: `Basic ${process.env.NODE_APP_PROTHEUS_TOKEN}`,
					"Access-Control-Allow-Origin": "*"
				},
				body: JSON.stringify(responseToSend),
				redirect: "follow",
				agent: httpsAgent,
			};

			const repsonseFromProtheus = await fetch(
				"https://api.diamanteagricola.com.br:8089/rest/TICKETAPI/attTicket/",
				requestOptions
			);
			console.log("resposta do Protheus", repsonseFromProtheus)
		} catch (error) {
			console.log("Erro ao enviar os dados para o protheus", error);
		}

		if (response.codTicketPro) {
			const forTicket = parseInt(response.codTicketPro);

			const updates = {
				ticket: forTicket
			};

			const result = await updateDoc(docRef, updates);
			console.log("reult of Serverhandler: ", result);
		}


	}
});



router.get("/get-from-srd", isAuth, async (req, res) => {
	const { dtIni, dtFim, ticket } = req.query.paramsQuery;

	console.log('Dados do SRD Sendo coletados')
	try {
		const httpsAgent = new https.Agent({
			rejectUnauthorized: false,
		});
		var requestOptions = {
			method: "GET",
			headers: {
				Accept: "application/json",
				"Content-Type": "application/json",
				Authorization: `Basic ${process.env.NODE_APP_PROTHEUS_TOKEN}`,
				"Access-Control-Allow-Origin": "*"
			},
			redirect: "follow",
			agent: httpsAgent,
		};
		let url;
		if (ticket.length > 0) {
			url = `https://api.diamanteagricola.com.br:8089/rest/ticketapi/get_tickets?dtIni=${dtIni}&dtFim=${dtFim}&ticket=${ticket}`
		} else {
			url = `https://api.diamanteagricola.com.br:8089/rest/ticketapi/get_tickets?dtIni=${dtIni}&dtFim=${dtFim}`
		}

		const repsonseFromProtheus = await fetch(
			url,
			requestOptions
		);
		const dataFromP = await repsonseFromProtheus.json()
		res.send(dataFromP).status(200)
		console.log('Dados Coletados com sucesso')
	} catch (error) {
		console.log("Erro ao enviar os dados para o protheus", error);
		res.send(err).status(400)
	}
})
router.get("/get-defensivos-from-srd", isAuth, async (req, res) => {
	const { products } = req.query.paramsQuery;
	
	console.log('Dados dos estoques do SRD Sendo coletados')
	try {
		const httpsAgent = new https.Agent({
			rejectUnauthorized: false,
		});
		var requestOptions = {
			method: "GET",
			headers: {
				Accept: "application/json",
				"Content-Type": "application/json",
				Authorization: `Basic ${process.env.NODE_APP_PROTHEUS_TOKEN}`,
				"Access-Control-Allow-Origin": "*"
			},
			redirect: "follow",
			agent: httpsAgent,
		};
		let url = `https://api.diamanteagricola.com.br:8089/rest/ticketapi/get_saldo_produtos`
		
		if(products === 'bio'){
			url+= `?grupo_produto=0072,0078,0079,0080,0081,0082,0083,0084,0085,0086`
			console.log('new url', url)
		}

		const repsonseFromProtheus = await fetch(
			url,
			requestOptions
		);
		const dataFromP = await repsonseFromProtheus.json()
		res.send(dataFromP).status(200)
		console.log('Dados de saldos dos estoques Coletados com sucesso')
	} catch (error) {
		console.log("Erro ao enviar os dados para o protheus", error);
		res.send(err).status(400)
	}
})
router.get("/get-open-pre-st-srd", isAuth, async (req, res) => {
	const { status } = req.query;
	
	console.log('Dados das pre ST do SRD Sendo coletados')
	try {
		const httpsAgent = new https.Agent({
			rejectUnauthorized: false,
		});
		var requestOptions = {
			method: "GET",
			headers: {
				Accept: "application/json",
				"Content-Type": "application/json",
				Authorization: `Basic ${process.env.NODE_APP_PROTHEUS_TOKEN}`,
				"Access-Control-Allow-Origin": "*"
			},
			redirect: "follow",
			agent: httpsAgent,
		};
		let url = `https://api.diamanteagricola.com.br:8089/rest/apisolicitacao/`
		
		if(status === 'aberto'){
			url+= `?status=aberto`
			console.log('new url', url)
		}

		const repsonseFromProtheus = await fetch(
			url,
			requestOptions
		);
		const dataFromP = await repsonseFromProtheus.json()
		res.send(dataFromP).status(200)
		console.log('dados das pr st enviados com sucesso')
	} catch (error) {
		console.log("Erro ao pegar os dados do protheus", error);
		res.send(error).status(400)
	}
})


router.post('/update-status-protheus-uploaded', isAuth, async (req, res) => {
	const data = await req.body
	console.log('data from django: ', data)
	if (data.length > 0) {
		data.forEach(element => {
			console.log('id vindo do django: ', element)
		});
	}
	const updateFieldsInDocuments = async (idsArray, updatedFields) => {

		const batch = writeBatch(db);

		// Array to store errors
		const errors = []

		// Iterate over the array of document IDs
		idsArray.forEach((docId) => {
			const docRef = doc(db, TABLES_FIREBASE.truckmove, docId);

			// Update specific fields in each document
			batch.update(docRef, updatedFields);
		});

		try {
			// Commit the batch
			await batch.commit();
		} catch (error) {

			// If an error occurs, handle it
			console.error('Error updating fields:', error);

			// Check for specific errors, e.g., document not found
			if (error.code === 'not-found') {
				errors.push({ docId: error.docId, message: 'Document not found' });
			} else {
				// For other errors, you can handle them accordingly
				errors.push({ docId: error.docId, message: error.message });
			}
		}
		return errors
	}


	// Usag
	const fieldsToUpdate = {
		uploadedToProtheus: true,
	};

	updateFieldsInDocuments(data, fieldsToUpdate)
		.then((errors) => {
			if (errors.length === 0) {
				console.log('Campos Alterados com sucesso recebidos do Django....');
			} else {
				console.error('Errors encountered during update:', errors);
			}
		})
		.catch((error) => {
			console.error('Erro ao alterar os documentos vindo do Django...:', error);
		});


	res.send('Dados recebidos com sucesso...').status(200)
})

router.post("/update-romaneio-from-protheus", isAuth, async (req, res) => {
	const data = await req.body;
	console.log('Data vindo do protheus: ', data)

	try {
		const docRef = doc(db, TABLES_FIREBASE.truckmove, data.id);
		const oldDoc = await getDoc(docRef);
		const oldDocData = oldDoc.data();

		let pesoBruto = "";
		let pesoTara = "";
		let pesoLiquido = "";
		let saida = "";
		let dataEntrada = false
		let newEntrada = ""

		if (Number(oldDocData.pesoBruto) > 0) {
			console.log("old Peso Bruto: ", oldDocData.pesoBruto);
			pesoBruto = Number(oldDocData.pesoBruto);
		} else if (Number(data.pesoBruto) > 0) {
			console.log('Novo Peso Bruto Atualizado')
			pesoBruto = Number(data.pesoBruto);
			if (Number(data.pesoBruto) > 0 && Number(data.pesoTara) === 0) {
				dataEntrada = true
				newEntrada = new Date()
			}
		}

		if (Number(oldDocData.tara) > 0) {
			console.log("old Peso Tara: ", oldDocData.tara);
			pesoTara = Number(oldDocData.tara);
		} else if (Number(data.pesoTara) > 0) {
			console.log('Novo Peso Tara Atualizado')
			pesoTara = Number(data.pesoTara);
		}

		if (Number(pesoTara) > 0 && Number(pesoBruto) > 0) {
			pesoLiquido = pesoBruto - pesoTara;
			saida = new Date();
			console.log('Novo Peso Líquido e Data de saída atualizado')
		}

		const updates = {
			...(Number(pesoTara) > 0 && { tara: pesoTara }),
			...(Number(pesoBruto) > 0 && { pesoBruto: pesoBruto }),
			...(Number(pesoLiquido) > 0 && { liquido: pesoLiquido }),
			...(Number(pesoLiquido) > 0 && { saida: saida }),
			...(dataEntrada === true && { entrada: newEntrada })
		};

		const result = await updateDoc(docRef, updates);
		const updatedDoc = await getDoc(docRef);
		const newDoc = updatedDoc.data();
		res.send(newDoc).status(200);
		dataEntrada = false
	} catch (err) {
		res.send("Erro ao alterar os pesos: ", err).status(400);
	}
});


router.post('/delete-romaneio-from-protheus', isAuth, async (req, res) => {
	const data = await req.body;
	console.log('Data vindo do protheus: ', data)

	

	try {
		// get documentRef
		const docRef = doc(db, TABLES_FIREBASE.truckmove, data.id);

		// get document to print it
		const oldDoc = await getDoc(docRef);
		const oldDocData = oldDoc.data();
		console.log('Documento encontrado para ser deletado: ', oldDocData)

		let bruto = oldDocData?.pesoBruto
		let tara = oldDocData?.tara
		
		if(bruto > 0){
			console.log('manter Bruto')
		} else {
			bruto = 2
		}
		
		if(tara > 0){
			console.log('manter tara')
		} else {
			tara = 1
		}

		const updates = {
			uploadedToProtheus: false,
			liquido: 1,
			userDeleted: data?.usuario_exclusao ? data?.usuario_exclusao : 'usuário não informado',
			dateDeleted: new Date(),
			saida: new Date(),
			tara: tara,
			pesoBruto: bruto
		};
	
		console.log('updates from protheus: ', updates)
	


		//update the document
		const result = await updateDoc(docRef, updates);
		console.log('resultado da alteração: ', result)

		if (oldDocData) {
			res.status(200).send('Documento excluído com sucesso...')
		}
	} catch (err) {
		console.log("erro ao deletar o documentO :, ", err)
		res.status(400).send("Erro ao deletar o documento: ", err);

	}
})

export default router;
