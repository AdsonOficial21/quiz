import { getDatabase, ref, push, onValue } from "firebase/database";
import { getApp } from "firebase/app"; // Import getApp to get the initialized app
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js"; // Import auth

export function initQuiz(adminUidFromUrl = null) { // Accept adminUid as a parameter
    const questionElement = document.getElementById('question');
    const answersElement = document.getElementById('answers');
    const nextButton = document.getElementById('next-button');
    const selfieContainer = document.getElementById('selfie-container');
    const webcamPreview = document.getElementById('webcam-preview');
    const selfieCanvas = document.getElementById('selfie-canvas');
    const takeSelfieButton = document.getElementById('take-selfie');
    const startWebcamButton = document.getElementById('start-webcam'); // Still exists but is hidden
    const selfiePreview = document.getElementById('selfie-preview');
    const retakeSelfieButton = document.getElementById('retake-selfie');
    const quizContainer = document.getElementById('quiz-container');

    // Firebase Database setup
    const db = getDatabase(getApp()); // Get the database instance from the initialized app
    const auth = getAuth(getApp()); // Get the auth instance
    const questionsRef = ref(db, 'questions');
    let selfiesRef; // This will be set dynamically based on user

    // Use adminUidFromUrl if available, otherwise fallback to a generic path or handle as not linked
    const baseSelfiePath = adminUidFromUrl ? `userSelfies/${adminUidFromUrl}` : 'selfies/anonymous'; // New logic
    selfiesRef = ref(db, baseSelfiePath); // Initialize selfiesRef with the determined path

    let currentStream;
    let questions = [];
    let currentQuestionIndex = 0;

    // Listen for auth state changes to get the current user
    // No longer strictly needed for selfie path, but kept if other auth features are desired later
    onAuthStateChanged(auth, (user) => {
        if (user) {
            // For now, this part remains but its influence on selfiesRef is reduced.
            // If you want to differentiate between *quiz player* and *admin*, more complex logic is needed.
            // For this prompt, selfies are saved under the *admin's* UID passed via URL.
            console.log("Quiz page user logged in (not directly affecting selfie storage path for this feature):", user.uid);
        } else {
            console.log("No user logged in on quiz page.");
        }
    });

    // Automatically start webcam when the page loads
    async function startWebcamAutomatically() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            webcamPreview.srcObject = stream;
            currentStream = stream;
            webcamPreview.style.display = 'block';
            // startWebcamButton.style.display = 'none'; // Already hidden in HTML
            takeSelfieButton.style.display = 'block';
            selfieContainer.querySelector('h2').textContent = "Posicione-se para a selfie:";
        } catch (err) {
            console.error("Erro ao acessar a câmera: ", err);
            alert("Não foi possível acessar a câmera. Por favor, verifique as permissões.");
            // If camera access fails, hide webcam related elements and show quiz directly (or an error message)
            webcamPreview.style.display = 'none';
            takeSelfieButton.style.display = 'none';
            retakeSelfieButton.style.display = 'none';
            selfieContainer.querySelector('h2').textContent = "Câmera indisponível. Continuando para o Quiz.";
            // Optionally, proceed to quiz directly if camera is not essential for playing
            setTimeout(() => {
                selfieContainer.style.display = 'none';
                quizContainer.style.display = 'block';
                loadQuestions();
            }, 2000);
        }
    }

    // Call the function to start webcam automatically
    startWebcamAutomatically(); // Call directly as selfie path is determined by URL param

    takeSelfieButton.addEventListener('click', () => {
        const context = selfieCanvas.getContext('2d');
        selfieCanvas.width = webcamPreview.videoWidth;
        selfieCanvas.height = webcamPreview.videoHeight;
        context.drawImage(webcamPreview, 0, 0, selfieCanvas.width, selfieCanvas.height);
        const dataUrl = selfieCanvas.toDataURL('image/png');
        selfiePreview.src = dataUrl;
        selfiePreview.style.display = 'block';
        webcamPreview.style.display = 'none';
        takeSelfieButton.style.display = 'none';
        retakeSelfieButton.style.display = 'block';
        selfieContainer.querySelector('h2').textContent = "Selfie Capturada!";
        stopWebcam();

        // Always attempt to save selfie now, using the determined selfiesRef path
        saveSelfie(dataUrl);

        selfieContainer.style.display = 'none';
        quizContainer.style.display = 'block';
        loadQuestions();
    });

    retakeSelfieButton.addEventListener('click', async () => {
        selfiePreview.style.display = 'none';
        retakeSelfieButton.style.display = 'none';
        selfieContainer.querySelector('h2').textContent = "Tire uma selfie para começar!";
        // Simply call the auto-start function again
        startWebcamAutomatically();
    });

    function stopWebcam() {
        if (currentStream) {
            currentStream.getTracks().forEach(track => track.stop());
            webcamPreview.srcObject = null;
        }
    }

    async function saveSelfie(dataUrl) {
        try {
            // Push selfie to the path determined by adminUidFromUrl or fallback
            await push(selfiesRef, { dataUrl: dataUrl, timestamp: Date.now() });
            console.log("Selfie salva no Firebase para o caminho:", selfiesRef.path.toString());
        } catch (error) {
            console.error("Erro ao salvar selfie no Firebase:", error);
            alert("Erro ao salvar a selfie. Por favor, tente novamente.");
        }
    }

    async function loadQuestions() {
        onValue(questionsRef, (snapshot) => {
            const data = snapshot.val();
            questions = [];
            if (data) {
                for (let id in data) {
                    questions.push(data[id]);
                }
            }

            if (questions.length > 0) {
                showQuestion();
            } else {
                questionElement.textContent = "Nenhuma pergunta disponível. Adicione perguntas no painel de administração.";
                answersElement.innerHTML = "";
                nextButton.style.display = 'none';
            }
        }, (error) => {
            console.error('Erro ao carregar perguntas do Firebase:', error);
            questionElement.textContent = "Erro ao carregar o quiz. Tente novamente mais tarde.";
            answersElement.innerHTML = "";
            nextButton.style.display = 'none';
        });
    }

    function showQuestion() {
        resetState();
        const currentQuestion = questions[currentQuestionIndex];
        questionElement.textContent = currentQuestion.question;

        Object.keys(currentQuestion.answers).forEach(key => {
            const button = document.createElement('button');
            button.classList.add('btn');
            button.textContent = `${key.toUpperCase()}: ${currentQuestion.answers[key]}`;
            button.dataset.answer = key;
            button.addEventListener('click', selectAnswer);
            answersElement.appendChild(button);
        });
    }

    function resetState() {
        nextButton.style.display = 'none';
        while (answersElement.firstChild) {
            answersElement.removeChild(answersElement.firstChild);
        }
    }

    function selectAnswer(e) {
        const selectedButton = e.target;
        const selectedAnswer = selectedButton.dataset.answer;
        const correctAnswer = questions[currentQuestionIndex].correctAnswer;

        Array.from(answersElement.children).forEach(button => {
            button.disabled = true; // Desabilita todos os botões após a seleção
            if (button.dataset.answer === correctAnswer) {
                button.classList.add('correct');
            } else {
                button.classList.add('incorrect');
            }
        });

        nextButton.style.display = 'block';
    }

    function handleNextButton() {
        currentQuestionIndex++;
        if (currentQuestionIndex < questions.length) {
            showQuestion();
        } else {
            questionElement.textContent = "Você completou o Quiz!";
            answersElement.innerHTML = "";
            nextButton.style.display = 'none';
        }
    }

    nextButton.addEventListener('click', handleNextButton);
}