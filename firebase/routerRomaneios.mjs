import express from "express";
import { getDocsFire } from "./actions.js";

import { collection, addDoc, doc, updateDoc, getDoc } from "firebase/firestore";
import { TABLES_FIREBASE } from "./firebase.typestables.js";
import { db } from './firebase.js'

const router = express.Router()

router.get('/', async (req, res) => {
    try {
        const data = await getDocsFire()
        console.log('pegando os dados: ', data.length)
        res.send(data).status(200)
    } catch (error) {
        console.log('Error : ', error)
    }
})

router.post('/upload-romaneio', async (req, res) => {
    console.log(req)
    const dataId = await req.body.id
    const docRef = doc(db, TABLES_FIREBASE.truckmove, dataId)
    const docSend = await getDoc(docRef)
    const docSendData = docSend.data()

    const response = {
        ...docSendData,
        id: dataId
    }
    console.log('response Here: ', response)

    res.send(response).status(200)

})
router.post('/update-romaneio-from-protheus', async (req, res) => {
    const data = await req.body

    try {
        const docRef = doc(db, TABLES_FIREBASE.truckmove, data.id)
        const oldDoc = await getDoc(docRef)
        const oldDocData = oldDoc.data()


        let pesoBruto = ''
        let pesoTara = ""
        let pesoLiquido = ''
        let saida = ""

        if (Number(oldDocData.pesoBruto) > 0) {
            console.log('old Peso Bruto: ', oldDocData.pesoBruto)
            pesoBruto = Number(oldDocData.pesoBruto)
        } else if (Number(data.pesoBruto) > 0) {
            pesoBruto = Number(data.pesoBruto)
        }

        if (Number(oldDocData.tara) > 0) {
            console.log('old Peso Tara: ', oldDocData.tara)
            pesoTara = Number(oldDocData.tara)
        } else if (Number(data.pesoTara) > 0) {
            pesoTara = Number(data.pesoTara)
        }


        if (Number(pesoTara) > 0 && Number(pesoBruto) > 0) {
            pesoLiquido = pesoBruto - pesoTara
            saida = new Date()
        }

        const updates = {
            ...(Number(pesoTara) > 0 && { tara: pesoTara }),
            ...(Number(pesoBruto) > 0 && { pesoBruto: pesoBruto }),
            ...(Number(pesoLiquido) > 0 && { liquido: pesoLiquido }),
            ...(Number(pesoLiquido) > 0 && { saida: saida })
        }

        const result = await updateDoc(docRef, updates)
        const updatedDoc = await getDoc(docRef)
        const newDoc = updatedDoc.data()
        res.send(newDoc).status(200)
    } catch (err) {
        res.send('Erro ao alterar os pesos: ', err).status(400)
    }

})


export default router