import express from "express";
import { authApp } from "./firebase.js";

import { getAuth } from "firebase-admin/auth";

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

// Endpoint to retrieve all users
router.get("/get-all-users",isAuth, async (req, res) => {
    try {
        const allUsers = [];
        let nextPageToken;

        // Function to retrieve users in batches
        do {
            const listUsersResult = await getAuth().listUsers(1000, nextPageToken);
            listUsersResult.users.forEach((userRecord) => {
                allUsers.push(userRecord.toJSON());
            });
            nextPageToken = listUsersResult.pageToken; // Get the next page token
        } while (nextPageToken);

        // Respond with the list of all users
        console.log('total users: ', allUsers.length)
        res.status(200).json({
            success: true,
            data: allUsers,
        });
    } catch (error) {
        console.error("Error fetching users:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch users",
            error: error.message,
        });
    }
});


export default router