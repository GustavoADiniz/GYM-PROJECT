// Importa as funções que precisamos do SDK do Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";

// TODO: Substitua os valores abaixo pela sua "Chave" do Firebase
// Para achar: Configurações do Projeto (Engrenagem) -> Role até o fim -> Seus Aplicativos -> Config
const firebaseConfig = {
  apiKey: "AIzaSyB-EUEKc_7zzszou9qP83ic7DZV-1CBrZw",
  authDomain: "saas-treino-andre.firebaseapp.com",
  projectId: "saas-treino-andre",
  storageBucket: "saas-treino-andre.firebasestorage.app",
  messagingSenderId: "629928465846",
  appId: "1:629928465846:web:f78a04948113efed17dd17",
  measurementId: "G-CKG3HGYKL2"
};

// Inicializa o Firebase
const app = initializeApp(firebaseConfig);

// Inicializa a Autenticação e o Banco de Dados
const auth = getAuth(app);
const db = getFirestore(app);

// Exporta para usar em outros arquivos
export { auth, db };
