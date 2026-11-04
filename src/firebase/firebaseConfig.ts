
import { initializeApp } from 'firebase/app';
import { getFirestore, collection } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyD6_608ecJ8aDH3VCZ0OfH5_u-uSvvOKI4",
  authDomain: "product-1bb70.firebaseapp.com",
  projectId: "product-1bb70",
  storageBucket: "product-1bb70.firebasestorage.app",
  messagingSenderId: "845591762862",
  appId: "1:845591762862:web:7914020b8d8ceb33ad1a3f",
  measurementId: "G-XRD3LZMQVS"
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);

// Firestore collection para sa products
export const productsCol = collection(db, 'products');
