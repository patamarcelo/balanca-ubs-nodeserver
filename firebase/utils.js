

import { collection, addDoc } from "firebase/firestore";
import { query, orderBy, getDocs, limit, where } from "firebase/firestore";
import { db } from "./firebase.js";

let start = new Date('2017-01-01');


export const getAndGenerateIdFirebase = async () => {
	const q = query(
		collection(db, "truckmove"),
		where("syncDate", "!=", null),
		orderBy("syncDate", "desc"),
		where("appDate", ">", start),
		orderBy("appDate", "desc"),
		limit(4)
	);
	const querySnapshot = await getDocs(q);
	let allData = [];
	querySnapshot.forEach((doc) => {
		// doc.data() is never undefined for query doc snapshots
		// console.log(doc.data().relatorioColheita, " => ", doc.data().entrada.toMillis());
		allData.push(doc.data());
	});

	const newSort = allData.sort((b,a) => a.syncDate.toMillis() - b.syncDate.toMillis() || b.appDate.toMillis() - a.appDate.toMillis())
	newSort.forEach((ele) => {
		console.log(ele.relatorioColheita, '=>', ele.syncDate.toDate().toLocaleString('pt-BR'))
	})
	return newSort[0];
};