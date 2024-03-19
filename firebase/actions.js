import { db } from './firebase.js'
import { collection, addDoc } from "firebase/firestore";
import { query, orderBy, getDocs, limit, where } from "firebase/firestore";
import { TABLES_FIREBASE } from "./firebase.typestables.js";
import { doc, onSnapshot, updateDoc, deleteDoc } from "firebase/firestore";



export const getDocsFire = async () => {
	let newProducts = []
	try {

		const q = query(
			collection(db, TABLES_FIREBASE.truckmove),
			where("syncDate", "!=", null),
			orderBy("syncDate", "desc"),
			limit(10)
		);
		const products = await getDocs(q)
		if (products.empty) {
			console.log('Sem Dados para a consulta')
		} else {
			products.forEach((doc) => {
				console.log('registro: ', doc.data())
				newProducts.push(doc.data())
			})
		}
	} catch (error) {
		console.log('erro ao pegar os dados: ', error)
	}
	return newProducts
}