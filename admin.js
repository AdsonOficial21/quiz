import { getDatabase, ref, push, onValue } from "firebase/database";
import { getAuth, onAuthStateChanged } from "firebase/auth"; // Import auth

export function initAdmin() {
    const newQuestionInput = document.getElementById('new-question');
    const answerAInput = document.getElementById('answer-a');
    const answerBInput = document.getElementById('answer-b');
    const answerCInput = document.getElementById('answer-c');
    const answerDInput = document.getElementById('answer-d');
    const correctAnswerSelect = document.getElementById('correct-answer');
    const addQuestionButton = document.getElementById('add-question-button');
    const questionsList = document.getElementById('questions-list');
    const gallerySection = document.getElementById('gallery-section');
    const selfieGallery = document.getElementById('selfie-gallery');
    const quizAdminSection = document.getElementById('quiz-admin-section');
    const sidebarLinks = document.querySelectorAll('.sidebar ul li a');
    const copyQuizLinkButton = document.getElementById('copy-quiz-link-button');
    const copyMessage = document.getElementById('copy-message');

    // Firebase Database setup
    const db = getDatabase();
    const auth = getAuth(); // Get auth instance
    const questionsRef = ref(db, 'questions');
    let userSelfiesRef = null; // This will be set dynamically based on the logged-in user
    let currentAdminUid = null; // Store the current admin's UID

    let questions = [];

    // Listen for authentication state changes
    onAuthStateChanged(auth, (user) => {
        if (user) {
            // User is signed in, set the user-specific selfies reference
            currentAdminUid = user.uid; // Store the UID of the logged-in admin
            userSelfiesRef = ref(db, `userSelfies/${currentAdminUid}`); // Use currentAdminUid
            console.log("Admin panel initialized for user:", currentAdminUid);
            // If gallery section is active, load selfies for this user
            if (document.getElementById('gallery-section').style.display !== 'none') {
                loadSelfies();
            }
        } else {
            // User is signed out
            currentAdminUid = null; // Clear admin UID
            userSelfiesRef = null;
            selfieGallery.innerHTML = '<p>Faça login para ver suas selfies.</p>';
            console.log("No user logged in to admin panel.");
        }
    });

    // Function to show/hide sections
    function showSection(sectionId) {
        document.querySelectorAll('.main-content > div').forEach(section => {
            section.style.display = 'none';
        });
        document.getElementById(sectionId).style.display = 'block';

        sidebarLinks.forEach(link => {
            if (link.dataset.section === sectionId) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });
    }

    // Event listeners for sidebar links
    sidebarLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const section = e.target.dataset.section;
            if (section) {
                showSection(section);
                if (section === 'gallery-section') {
                    if (userSelfiesRef) { // Only load if a user is logged in
                        loadSelfies();
                    } else {
                        selfieGallery.innerHTML = '<p>Por favor, faça login para visualizar as selfies.</p>';
                    }
                }
            }
        });
    });

    // Default to showing the Quiz section
    showSection('quiz-admin-section');

    async function loadQuestions() {
        onValue(questionsRef, (snapshot) => {
            const data = snapshot.val();
            questions = [];
            if (data) {
                for (let id in data) {
                    questions.push(data[id]);
                }
            }
            displayQuestions();
        }, (error) => {
            console.error('Erro ao carregar perguntas do Firebase:', error);
            questions = [];
            displayQuestions();
        });
    }

    function displayQuestions() {
        questionsList.innerHTML = '';
        if (questions.length === 0) {
            const li = document.createElement('li');
            li.textContent = "Nenhuma pergunta adicionada ainda.";
            questionsList.appendChild(li);
            return;
        }
        questions.forEach((q, index) => {
            const li = document.createElement('li');
            li.innerHTML = `<strong>${index + 1}. ${q.question}</strong><br>
                            A: ${q.answers.a}<br>
                            B: ${q.answers.b}<br>
                            C: ${q.answers.c}<br>
                            D: ${q.answers.d}<br>
                            Resposta Correta: ${q.correctAnswer.toUpperCase()}`;
            questionsList.appendChild(li);
        });
    }

    async function saveQuestionToFirebase(newQuestion) {
        try {
            await push(questionsRef, newQuestion);
            console.log('Pergunta adicionada ao Firebase.');
            alert('Pergunta adicionada e salva!');
        } catch (error) {
            console.error('Erro ao salvar pergunta no Firebase:', error);
            alert('Erro ao salvar a pergunta.');
        }
    }

    addQuestionButton.addEventListener('click', () => {
        const questionText = newQuestionInput.value.trim();
        const answerA = answerAInput.value.trim();
        const answerB = answerBInput.value.trim();
        const answerC = answerCInput.value.trim();
        const answerD = answerDInput.value.trim();
        const correctAnswer = correctAnswerSelect.value;

        if (questionText && answerA && answerB && answerC && answerD) {
            const newQuestion = {
                question: questionText,
                answers: {
                    a: answerA,
                    b: answerB,
                    c: answerC,
                    d: answerD
                },
                correctAnswer: correctAnswer
            };
            saveQuestionToFirebase(newQuestion);
            newQuestionInput.value = '';
            answerAInput.value = '';
            answerBInput.value = '';
            answerCInput.value = '';
            answerDInput.value = '';
            correctAnswerSelect.value = 'a';
        } else {
            alert('Por favor, preencha todos os campos!');
        }
    });

    // Selfie Gallery Functions - now loading from user-specific path
    function loadSelfies() {
        if (!userSelfiesRef) {
            selfieGallery.innerHTML = '<p>Faça login para ver suas selfies.</p>';
            return;
        }

        onValue(userSelfiesRef, (snapshot) => {
            const data = snapshot.val();
            selfieGallery.innerHTML = ''; // Clear previous selfies
            const selfies = [];
            if (data) {
                for (let id in data) {
                    selfies.push(data[id].dataUrl); // Assuming 'dataUrl' is the field for the selfie image
                }
            }

            if (selfies.length === 0) {
                selfieGallery.innerHTML = '<p>Nenhuma selfie enviada ainda para este usuário.</p>';
                return;
            }
            selfies.forEach((selfieDataUrl, index) => {
                const imgContainer = document.createElement('div');
                imgContainer.classList.add('selfie-item');
                const img = document.createElement('img');
                img.src = selfieDataUrl;
                img.alt = `Selfie ${index + 1}`;
                imgContainer.appendChild(img);
                selfieGallery.appendChild(imgContainer);
            });
        }, (error) => {
            console.error('Erro ao carregar selfies do Firebase:', error);
            selfieGallery.innerHTML = '<p>Erro ao carregar selfies.</p>';
        });
    }

    // Function to copy quiz link
    copyQuizLinkButton.addEventListener('click', () => {
        if (currentAdminUid) {
            // Get the base URL of the quiz page
            const quizPageUrl = `${window.location.origin}/index.html?adminUid=${currentAdminUid}`;
            navigator.clipboard.writeText(quizPageUrl).then(() => {
                copyMessage.style.display = 'block';
                setTimeout(() => {
                    copyMessage.style.display = 'none';
                }, 3000); // Hide message after 3 seconds
            }).catch(err => {
                console.error('Failed to copy text: ', err);
                alert('Falha ao copiar o link. Por favor, copie manualmente: ' + quizPageUrl);
            });
        } else {
            alert('Faça login para gerar um link de quiz personalizado.');
        }
    });

    // Initialize with loading questions from Firebase
    loadQuestions();
}