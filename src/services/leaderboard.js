import {
    collection,
    addDoc,
    query,
    orderBy,
    limit,
    getDocs,
    serverTimestamp
} from "firebase/firestore";
import { db } from "../lib/firebase";

const COLLECTION_NAME = "leaderboard";

/**
 * Saves a new score to the leaderboard.
 * @param {string} name - Player name
 * @param {number} timeInSeconds - Total time taken
 */
export const saveScore = async (name, timeInSeconds) => {
    try {
        const docRef = await addDoc(collection(db, COLLECTION_NAME), {
            name: name || "Anonymous",
            time: timeInSeconds,
            timestamp: serverTimestamp()
        });
        return docRef.id;
    } catch (e) {
        console.error("Error adding document: ", e);
        return null;
    }
};

/**
 * Retrieves the top 10 fastest scores.
 */
export const getTopScores = async () => {
    try {
        const q = query(
            collection(db, COLLECTION_NAME),
            orderBy("time", "asc"),
            limit(10)
        );

        const querySnapshot = await getDocs(q);
        const scores = [];
        querySnapshot.forEach((doc) => {
            scores.push({ id: doc.id, ...doc.data() });
        });
        return scores;
    } catch (e) {
        console.error("Error getting documents: ", e);
        return [];
    }
};
