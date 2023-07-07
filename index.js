import express from "express";
import cors from "cors";
import "./loadEnvironment.mjs";
import defensivos from "./router.mjs";

const PORT = process.env.PORT || 5050;
const app = express();

app.use(cors());
app.use(express.json());

app.use("/defensivos", defensivos);

app.get("/", async (req, res) => {
	// const data = await axios(config)
	// 	.then((resp) => resp.data)
	// 	.catch((e) => e);
	data = { data: 1 };

	res.json(data);
});

app.listen(PORT, () => {
	console.log(`Example app listening on port ${PORT}`);
});
