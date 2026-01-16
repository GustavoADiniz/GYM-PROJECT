/**
 * Utilitários Globais e Configuração Firebase Modular
 */

import { auth, db } from './firebase-config.js';
import {
    collection,
    query,
    where,
    getDocs,
    addDoc,
    updateDoc,
    doc,
    limit,
    getDoc
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";
import {
    signOut
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";

/**
 * Utilitário para gerar Hash SHA-256 (Segurança de senhas)
 */
window.hashSenha = async function (senha) {
    const msgUint8 = new TextEncoder().encode(senha);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

/**
 * Função Global de Login
 * Trata tanto o login administrativo do treinador quanto o login dos alunos.
 */
window.fazerLogin = async function (usuario, senha) {
    console.log("Tentando login para:", usuario);

    const isHash = (str) => /^[a-f0-9]{64}$/i.test(str);
    const senhaFornecidaHash = await window.hashSenha(senha);
    const senhaFornecidaHashUpper = senhaFornecidaHash.toUpperCase();

    try {
        // 1. TENTA LOGIN COMO TREINADOR (ADMIN)
        const qAdmin = query(collection(db, "admins"), where("username", "==", usuario));
        const adminSnapshot = await getDocs(qAdmin);

        if (!adminSnapshot.empty) {
            const adminDoc = adminSnapshot.docs[0];
            const adminData = adminDoc.data();
            const storedPass = adminData.password;

            let logadoAdmin = false;

            if (storedPass === senhaFornecidaHash || storedPass.toUpperCase() === senhaFornecidaHashUpper || storedPass === senha) {
                logadoAdmin = true;
            }

            if (logadoAdmin) {
                if (storedPass !== senhaFornecidaHash && !isHash(senha)) {
                    await updateDoc(doc(db, "admins", adminDoc.id), { password: senhaFornecidaHash });
                    console.log("Senha do administrador normalizada para Hash.");
                }

                sessionStorage.setItem("isAdmin", "true");
                sessionStorage.setItem("adminId", adminDoc.id);
                sessionStorage.setItem("adminName", usuario);
                window.location.href = "telas/dashboard.html";
                return;
            }
        }

        // Caso especial: Admin Inicial
        const qAnyAdmin = query(collection(db, "admins"), limit(1));
        const allAdmins = await getDocs(qAnyAdmin);

        if (allAdmins.empty && usuario === "rafael" && senha === "123") {
            const newAdmin = { username: "rafael", password: senhaFornecidaHash };
            const docRef = await addDoc(collection(db, "admins"), newAdmin);
            sessionStorage.setItem("isAdmin", "true");
            sessionStorage.setItem("adminId", docRef.id);
            sessionStorage.setItem("adminName", "rafael");
            window.location.href = "telas/dashboard.html";
            return;
        }

    } catch (e) {
        console.error("Erro ao verificar admins:", e);
    }

    // 2. TENTA LOGIN COMO ALUNO
    try {
        const qStudent = query(collection(db, "students"), where("login", "==", usuario));
        const studentSnapshot = await getDocs(qStudent);

        if (!studentSnapshot.empty) {
            const studentDoc = studentSnapshot.docs[0];
            const studentData = studentDoc.data();
            const storedPass = studentData.password;

            let logadoEstudante = false;

            if (storedPass === senhaFornecidaHash || storedPass.toUpperCase() === senhaFornecidaHashUpper || storedPass === senha) {
                logadoEstudante = true;
            }

            if (logadoEstudante) {
                if (storedPass !== senhaFornecidaHash && !isHash(senha)) {
                    await updateDoc(doc(db, "students", studentDoc.id), {
                        password: senhaFornecidaHash,
                        passwordPlain: senha
                    });
                    console.log("Senha do aluno migrada/normalizada com sucesso.");
                }

                sessionStorage.setItem("studentId", studentDoc.id);
                sessionStorage.setItem("studentName", studentData.name);
                window.location.href = "telas/student.html";
                return;
            }
        }

        alert("Usuário ou senha incorretos.");

    } catch (error) {
        console.error("Erro login aluno:", error);
        alert("Erro ao conectar no banco de dados.");
    }
};

/**
 * Função Global de Logout
 */
window.fazerLogout = async function () {
    await signOut(auth);
    sessionStorage.clear();
    const isInsideTelas = window.location.pathname.includes('/telas/');
    window.location.href = isInsideTelas ? "../index.html" : "index.html";
};

/**
 * Verifica Autenticação no Dashboard
 */
window.verificarAuthDashboard = function () {
    if (sessionStorage.getItem("isAdmin") !== "true") {
        const isInsideTelas = window.location.pathname.includes('/telas/');
        window.location.href = isInsideTelas ? "../index.html" : "index.html";
    }
};

/**
 * Verifica Autenticação do Aluno
 */
window.verificarAuthAluno = function () {
    if (!sessionStorage.getItem("studentId")) {
        const isInsideTelas = window.location.pathname.includes('/telas/');
        window.location.href = isInsideTelas ? "../index.html" : "index.html";
    }
};

// Exporta para uso em outros módulos se necessário
export { auth, db };
