import express from "express";
import db from "./mongo-con.js";
import { ObjectId } from "mongodb";

// import { appCheckVerification } from "./firebase-service.js";

const router = express.Router();

// This section will help you get a list of all the records.
// router.get("/", [appCheckVerification], async (req, res) => {
router.get("/", async (req, res) => {
	console.log("gerando os dados solicitados");
	console.log("Access Token firebase: ,", req.header("X-Firebase-AppCheck"));
	let collection = await db.collection("aplicacoes");
	let results = await collection
		.find({
			$and: [{ "plantations.plantation.harvest_name": "2023/2024" }],
			// $or: [{ date: { $gte: "2023-07-14" } }]
			$or: [{ status: "sought" }, { date: { $gte: "2023-09-10" } }]
		})
		// .find({ code: "AP20", date: { $gte: "2023-07-01" } })
		// .find({ date: { $gte: "2023-07-01" } })
		.toArray();
	res.send(results).status(200);
});

router.get("/datadetail", async (req, res) => {
	console.log("gerando os dados solicitados para tabela do farmbox");
	console.log("Access Token firebase: ,", req.header("X-Firebase-AppCheck"));
	let collection = await db.collection("aplicacoes");
	let results = await collection
		.find({
			$and: [{ "plantations.plantation.harvest_name": "2023/2024" }]
			// $or: [{ status: "sought" }, { date: { $gte: "2023-07-17" } }]
		})
		// .find({ code: "AP20", date: { $gte: "2023-07-01" } })
		// .find({ date: { $gte: "2023-07-01" } })
		.toArray();
	res.send(results).status(200);
});

// This section will help you get a single record by id
router.get("/:id", async (req, res) => {
	let collection = await db.collection("records");
	let query = { _id: new ObjectId(req.params.id) };
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
	const query = { _id: new ObjectId(req.params.id) };
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
	const query = { _id: new ObjectId(req.params.id) };

	const collection = db.collection("records");
	let result = await collection.deleteOne(query);

	res.send(result).status(200);
});

export default router;
