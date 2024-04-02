import express from "express";
import cors from "cors";
import "./loadEnvironment.mjs";

import defensivos from "./router.mjs";
import romaneios from './firebase/routerRomaneios.mjs'
import bodyParser from 'body-parser';


const PORT = process.env.PORT || 3000;
const app = express();

app.use(cors());
app.use(express.json());
app.use(bodyParser.urlencoded({
	extended: true
}));
app.use(bodyParser.json());

app.use("/defensivos", defensivos);
app.use("/romaneios", romaneios);

app.get("/", async (req, res) => {
	console.log('requisição da porta regular: ', req)
	// const data = await axios(config)
	// 	.then((resp) => resp.data)
	// 	.catch((e) => e);
	const data = { data: 1 };

	res.json(data);
});

app.listen(PORT, () => {
	console.log(`App Rodando na Porta: ${PORT}`);
});
