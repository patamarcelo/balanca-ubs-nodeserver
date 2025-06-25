import express from "express";
import db from "./mongo-con.js";
import {
	ObjectId
} from "mongodb";

// import { appCheckVerification } from "./firebase-service.js";


// import { createRequire } from 'module';
// const require = createRequire(import.meta.url);
// const dataFetch = require('./prods-open.json');


const router = express.Router();

const dictColor = (data) => {
	if (data < 0.50) {
		return '#E4D00A'
	}
	if (data < 1) {
		return 'blue'
	}
	if (data === 1) return 'green'
	if (data > 1) return 'red'
}

const fillColor = (solicitado, aplicado) => {
	if (solicitado === aplicado) {
		return 'green'
	}
	if (aplicado > 0) {
		return '#E4D00A'
	}
	if (aplicado === 0) {
		return 'red'
	}
	return 'blue'
}

const colorDict = [
	{
		tipo: "Inseticida",
		color: "rgb(218,78,75)"
	},
	{
		tipo: "Herbicida",
		color: "rgb(166,166,54)"
	},
	{
		tipo: "Adjuvante",
		color: "rgb(136,171,172)"
	},
	{
		tipo: "Óleo",
		color: "rgb(120,161,144)"
	},
	{
		tipo: "Micronutrientes",
		color: "rgb(118,192,226)"
	},
	{
		tipo: "Fungicida",
		color: "rgb(238,165,56)"
	},
	{
		tipo: "Fertilizante",
		color: "rgb(76,180,211)"
	},
	{
		tipo: "Nutrição ",
		color: "rgb(87,77,109)"
	},
	{
		tipo: "Biológico",
		color: "rgb(69,133,255)"
	}
];

const getColorChip = (data) => {
	const folt = colorDict.filter((tipo) => tipo.tipo === data);
	if (folt.length > 0) {
		return folt[0].color;
	} else {
		return "rgb(255,255,255,0.1)";
	}
};

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



// This section will help you get a list of all the records.
// router.get("/", [appCheckVerification], async (req, res) => {
router.get("/", async (req, res) => {
	const today = new Date();
	const getDay = new Date(new Date().setDate(today.getDate() - 30));
	const formatDay = getDay.toISOString().split("T")[0];
	console.log("gerando os dados solicitados");
	console.log("Access Token firebase: ,", req.header("X-Firebase-AppCheck"));
	const {
		safra,
		ciclo
	} = req.query.safraCiclo;
	console.log("Safra: ", safra, "Ciclo: ", ciclo);
	let collection = db.collection("aplicacoes");
	const safra_2025_2026 = "2025/2026"
	let results = await collection
		.find({
			$and: [
				{
					$or: [
						{
							"plantations.plantation.harvest_name": safra
						}, {
							"plantations.plantation.harvest_name": safra_2025_2026
						}
					]
				}, {
					$or: [{
						status: "sought"
					}, {
						date: {
							$gte: formatDay
						}
					}]
				}
			]
		}, {
			projection: {
				charge: 0, // Exclude the 'charge' field from the result,
				"inputs.plantations_costs": 0,
				"plantations.plantation.plot": 0,
				"plantations.plantation.geo_points": 0
			}
		})
		// .find({ code: "AP20", date: { $gte: "2023-07-01" } })
		// .find({ date: { $gte: "2023-07-01" } })
		.toArray();
	res.send(results).status(200);
	console.log("Dados gerados com sucessoso");
});

router.get("/pluviometria", async (req, res) => {
	let collection = db.collection("pluviometria");
	// console.log(req.query);
	// console.log(req.query.qua);
	const today = new Date();
	const getDay = new Date(new Date().setDate(today.getDate() - 8));
	const formatDay = getDay.toISOString().split("T")[0];
	let results = await collection
		.find({
			$and: [{
				date: {
					$gte: formatDay
				}
			}]
		})
		.toArray();
	const data = {
		quantidade: results.length,
		result: results
	};
	res.send(data).status(200);
});

router.get("/datadetail", async (req, res) => {
	console.log("gerando os dados solicitados para tabela do farmbox");
	console.log("Access Token firebase: ,", req.header("X-Firebase-AppCheck"));
	let collection = db.collection("aplicacoes");
	const safra_2023_2024 = "2023/2024"
	const safra_2024_2025 = "2024/2025"
	const safra_2025_2026 = "2025/2026"
	
	const {
		safra,
		ciclo
	} = req.query.safraCiclo;
	let results = await collection
		.find({
			$or: [{
				"plantations.plantation.harvest_name": safra_2024_2025
			},
			{
				"plantations.plantation.harvest_name": safra_2025_2026
			},
			],
			$and: [
			{
				"plantations.plantation.cycle": parseInt(ciclo)
			}
			]
			// $or: [{ status: "sought" }, { date: { $gte: "2023-07-17" } }]
		}, {
			projection: {
				charge: 0, // Exclude the 'charge' field from the result,
				"inputs.plantations_costs": 0,
				"plantations.plantation.plot": 0,
				"plantations.plantation.geo_points": 0,
			}
		})
		// .find({ code: "AP20", date: { $gte: "2023-07-01" } })
		// .find({ date: { $gte: "2023-07-01" } })
		.toArray();
	res.send(results).status(200);
});

router.get("/data-detail-plantio", async (req, res) => {
	console.log("Access Token firebase: ,", req.header("X-Firebase-AppCheck"));
	let collection = db.collection("aplicacoes");
	// const { safra, ciclo } = req.query

	const {
		safra,
		ciclo
	} = req.query.safraCiclo
	let results = await collection
		.find({
			inputs: {
				$elemMatch: {
					"input.name": "Colheita de Grãos "
				}
			},
			plantations: {
				$elemMatch: {
					"plantation.harvest_name": safra,
					"plantation.cycle": parseInt(ciclo)
				}
			}
		}, {
			projection: {
				charge: 0, // Exclude the 'charge' field from the result,
				"inputs.plantations_costs": 0,
				"plantations.plantation.plot": 0,
				"plantations.plantation.geo_points": 0,
			}
		})
		.toArray();
	// .explain("executionStats")
	if (!results) res.send("Not found").status(404);
	else res.send(results).status(200);
});


router.get("/data-open-apps", async (req, res) => {
	console.log('pegando dados das aplicacoes em aberto')
	let collection = db.collection('aplicacoes');
	const safra_2023_2024 = "2023/2024"
	const safra_2024_2025 = "2024/2025"
	const safra_2025_2026 = "2025/2026"

	let results = await collection
		.find({
			$or: [{
				"plantations.plantation.harvest_name": safra_2024_2025
			},
			{
				"plantations.plantation.harvest_name": safra_2025_2026
			},
			],
			status: "sought"
		}, {
			projection: {
				charge: 0, // Exclude the 'charge' field from the result,
				"inputs.plantations_costs": 0,
				"plantations.plantation.plot": 0,
				"plantations.plantation.geo_points": 0,
			}
		})
		.toArray();
	res.send(results).status(200)

})

router.get("/data-open-apps-fetch-app", isAuth, async (req, res) => {
	console.log('pegando dados das aplicacoes em aberto')
	let collection = db.collection('aplicacoes');
	const safra_2023_2024 = "2023/2024"
	const safra_2024_2025 = "2024/2025"
	const safra_2025_2026 = "2025/2026"

	let results = await collection
		.find({
			$or: [{
				"plantations.plantation.harvest_name": safra_2024_2025
			},
			{
				"plantations.plantation.harvest_name": safra_2025_2026
			},
			],
			status: "sought"
		}, {
			projection: {
				charge: 0, // Exclude the 'charge' field from the result,
				"inputs.plantations_costs": 0,
				"plantations.plantation.plot": 0,
				"plantations.plantation.geo_points": 0,
			}
		})
		.toArray();
	// const results = dataFetch
	const formatedArr = results.map((data) => {
		const operation = data.inputs.filter((input) => input.input.input_type_name === 'Operação')
		const apNumber = data.code
		const idAp = data.id
		const farmName = data.plantations[0].plantation.farm_name
		const cultura = data.plantations[0].plantation.culture_name
		const safra = data.plantations[0].plantation.harvest_name
		const ciclo = data.plantations[0].plantation.cycle
		const safraCicloOrder = Number(safra.replace('/', '') + ciclo)
		const dateAp = data.date
		const endDateAp = data.end_date
		const operationResult = operation ? operation[0]?.input?.name.trim() : 'Sem Operação'
		const products = data.inputs.map((input) => {
			const colorChip = getColorChip(input.input.input_type_name)
			return ({
				product: input.input.name,
				type: input.input.input_type_name,
				quantidadeSolicitada: input.sought_quantity,
				doseSolicitada: input.sought_dosage_value,
				colorChip
			})
		})

		const parcelas = data.plantations.map((plantation) => {
			const parcela = plantation.plantation.name
			const areaSolicitada = plantation.sought_area
			const areaAplicada = plantation.applied_area
			const parcelaId = plantation.id
			const variedade = plantation.plantation.variety_name
			const cultura = plantation.plantation.culture_name
			const date = plantation.plantation.date
			const date_prev_colheita = plantation.plantation.harvest_prediction_date

			const fillColorParce = fillColor(areaSolicitada, areaAplicada)

			return ({
				parcela,
				areaSolicitada,
				areaAplicada,
				parcelaId,
				fillColorParce,
				variedade,
				cultura,
				date,
				date_prev_colheita

			})
		})


		const sortedParcelas = parcelas.sort((a, b) => a.parcela.localeCompare(b.parcela)).sort((a, b) => a.fillColorParce.localeCompare(b.fillColorParce))
		const areaTotalSolicitada = parcelas.reduce((acc, curr) => acc += curr.areaSolicitada, 0)
		const areaTotalAplicada = parcelas.reduce((acc, curr) => acc += curr.areaAplicada, 0)
		const saldoAplicar = areaTotalSolicitada - areaTotalAplicada

		const percent = parseFloat((areaTotalAplicada / areaTotalSolicitada).toFixed(2))

		const percentColor = dictColor(percent)

		return ({
			idAp: idAp,
			code: apNumber,
			safra,
			ciclo,
			safraCicloOrder,
			farmName,
			cultura,
			dateAp,
			endDateAp,
			operation: operationResult,
			areaSolicitada: areaTotalSolicitada,
			areaAplicada: areaTotalAplicada,
			saldoAreaAplicar: saldoAplicar,
			percent,
			percentColor,
			parcelas: sortedParcelas,
			prods: products,
		})
	})
	const sortResult = formatedArr
		.sort((a, b) => a.idAp - b.idAp)
		.sort((a, b) => a.safraCicloOrder - b.safraCicloOrder)
		.sort((a, b) => a.farmName.localeCompare(b.farmName))

	const onlyFarms = sortResult.map((data) => data.farmName)
	const setFarms = [...new Set(onlyFarms)]

	const response = {
		farms: setFarms,
		data: sortResult
	}

	res.send(response).status(200)
})


router.get("/data-open-apps-only-bio", async (req, res) => {
	console.log('pegando dados das aplicacoes em aberto de biológicos')
	let collection = db.collection('aplicacoes');
	const safra_2023_2024 = "2023/2024"
	const safra_2024_2025 = "2024/2025"
	const safra_2025_2026 = "2025/2026"

	let results = await collection
		.find({
			$or: [{
				"plantations.plantation.harvest_name": safra_2024_2025
			},
			{
				"plantations.plantation.harvest_name": safra_2025_2026
			},
			],
			$and: [{
				"inputs.input.input_type_name": 'Biológico'
			},
			],
			status: "sought",
		}, {
			projection: {
				charge: 0, // Exclude the 'charge' field from the result,
				"inputs.plantations_costs": 0,
				"plantations.plantation.plot": 0,
				"plantations.plantation.geo_points": 0,
			}
		})
		.toArray();
	res.send(results).status(200)
})

// This section will help you get a single record by id
router.get("/:id", async (req, res) => {
	let collection = await db.collection("records");
	let query = {
		_id: new ObjectId(req.params.id)
	};
	let result = await collection.findOne(query);

	if (!result) res.send("Not found").status(404);
	else res.send(result).status(200);
});

// This section will help you create a new record.
router.post("/", async (req, res) => {
	let newDocument = {
		name: req.body.name,
		position: req.body.position,
		level: req.body.level
	};
	let collection = await db.collection("records");
	let result = await collection.insertOne(newDocument);
	res.send(result).status(204);
});

// This section will help you update a record by id.
router.patch("/:id", async (req, res) => {
	const query = {
		_id: new ObjectId(req.params.id)
	};
	const updates = {
		$set: {
			name: req.body.name,
			position: req.body.position,
			level: req.body.level
		}
	};

	let collection = await db.collection("records");
	let result = await collection.updateOne(query, updates);

	res.send(result).status(200);
});

// This section will help you delete a record
router.delete("/:id", async (req, res) => {
	const query = {
		_id: new ObjectId(req.params.id)
	};

	const collection = db.collection("records");
	let result = await collection.deleteOne(query);

	res.send(result).status(200);
});

export default router;