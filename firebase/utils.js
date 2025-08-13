import {
	collection,
	addDoc
} from "firebase/firestore";
import {
	query,
	orderBy,
	getDocs,
	limit,
	where
} from "firebase/firestore";
import {
	db
} from "./firebase.js";

let start = new Date('2024-01-01');


// export const getAndGenerateIdFirebase = async (quantity = 5) => {
// 	const q = query(
// 		collection(db, "truckmove"),
// 		where("syncDate", "!=", null),
// 		orderBy("syncDate", "desc"),
// 		where("appDate", ">", start),
// 		orderBy("appDate", "desc"),
// 		limit(quantity)
// 	);
// 	const querySnapshot = await getDocs(q);
// 	let allData = [];
// 	querySnapshot.forEach((doc) => {
// 		// doc.data() is never undefined for query doc snapshots
// 		// console.log(doc.data().relatorioColheita, " => ", doc.data().entrada.toMillis());
// 		allData.push(doc.data());
// 	});

// 	const newSort = allData.sort((b, a) => a.syncDate.toMillis() - b.syncDate.toMillis() || b.appDate.toMillis() - a.appDate.toMillis())
// 	newSort.forEach((ele) => {
// 		console.log(ele.relatorioColheita, ' order =>', ele.syncDate.toDate().toLocaleString('pt-BR'))
// 	})

// 	const sortByRomaneio = newSort.sort((a, b) => a.relatorioColheita - b.relatorioColheita);

// 	sortByRomaneio.forEach((doc) => {
// 		console.log('order => ', doc.relatorioColheita,)
// 	})
// 	console.log('order => Last of array: ', sortByRomaneio[sortByRomaneio.length - 1]?.relatorioColheita)

// 	const lastElement = sortByRomaneio[sortByRomaneio.length - 1]

// 	return lastElement;
// };

export const getAndGenerateIdFirebase = async (quantity = 5) => {
	const q = query(
		collection(db, "truckmove"),
		where("syncDate", "!=", null),
		orderBy("syncDate", "desc"),
		where("appDate", ">", start),
		orderBy("appDate", "desc"),
		limit(quantity)
	);

	const querySnapshot = await getDocs(q);
	let allData = [];
	querySnapshot.forEach((doc) => {
		allData.push(doc.data());
	});

	const newSort = allData.sort((b, a) => a.syncDate.toMillis() - b.syncDate.toMillis() || b.appDate.toMillis() - a.appDate.toMillis());
	newSort.forEach((ele) => {
		console.log(ele.relatorioColheita, ' order =>', ele.syncDate.toDate().toLocaleString('pt-BR'));
	});
	// Ordena pelo relatorioColheita em ordem crescente
	const sorted = allData.sort((a, b) => a.relatorioColheita - b.relatorioColheita);

	// Pega penúltimo e último (se existirem)
	const beforeLastElement = sorted.length >= 2 ? sorted[sorted.length - 2] : null;
	const lastElement = sorted.length >= 1 ? sorted[sorted.length - 1] : null;

	// Log dos elementos para debug
	console.log("Penúltimo romaneio:", beforeLastElement?.relatorioColheita);
	console.log("Último romaneio:", lastElement?.relatorioColheita);

	// Se diferença não for 1, ajusta o último para ser penúltimo + 1
	if (beforeLastElement && lastElement) {
		const diff = lastElement.relatorioColheita - beforeLastElement.relatorioColheita;
		if (diff !== 1) {
			console.log("Diferença entre últimos romaneios diferente de 1, ajustando...");
			lastElement.relatorioColheita = beforeLastElement.relatorioColheita + 1;
		}
	}

	return { beforeLastElement, lastElement };
};

export const getAndGenerateIdFirebaseBeforeLast = async (quantity = 7) => {
	const q = query(
		collection(db, "truckmove"),
		where("syncDate", "!=", null),
		orderBy("syncDate", "desc"),
		where("appDate", ">", start),
		orderBy("appDate", "desc"),
		limit(quantity)
	);
	const querySnapshot = await getDocs(q);
	let allData = [];
	querySnapshot.forEach((doc) => {
		// doc.data() is never undefined for query doc snapshots
		// console.log(doc.data().relatorioColheita, " => ", doc.data().entrada.toMillis());
		allData.push(doc.data());
	});

	const newSort = allData.sort((b, a) => a.syncDate.toMillis() - b.syncDate.toMillis() || b.appDate.toMillis() - a.appDate.toMillis())
	const sortByRomaneio = newSort.sort((a, b) => a.relatorioColheita - b.relatorioColheita);

	sortByRomaneio.forEach((ele) => {
		console.log(ele.relatorioColheita, 'order before last =>', ele.syncDate.toDate().toLocaleString('pt-BR'))
	})

	const lastElement = sortByRomaneio[sortByRomaneio.length - 1]

	return lastElement;
};