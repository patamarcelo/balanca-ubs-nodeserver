import express from "express";
import { authApp } from "./firebase.js";

import { getAuth } from "firebase-admin/auth";

const router = express.Router();


router.post('/check-user', async (req, res) => {
    try {
        const { uid } = req.body;

        if (!uid) {
            return res.status(400).json({ error: 'UID is required' });
        }

        console.log('uid: ', uid)
        getAuth().getUser(uid)
            .then(userRecord => {
                console.log('User data:', userRecord.toJSON())
                // Check if user is active
                // Check if user is active
                if (userRecord.disabled) {
                    // User is not active
                    res.status(403).send({ message: 'User is not active.' });
                } else {
                    // User is active
                    res.status(200).send({ message: 'User is active.', user: userRecord.toJSON() });
                }
            })
            .catch(error => console.error('Error fetching user data:', error));
    } catch (error) {
        console.error('Error fetching user data:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});


export default router