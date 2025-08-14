export function initQuiz() {
    const questionElement = document.getElementById('question');
    const answersElement = document.getElementById('answers');
    const nextButton = document.getElementById('next-button');
    const selfieContainer = document.getElementById('selfie-container');
    const webcamPreview = document.getElementById('webcam-preview');
    const selfieCanvas = document.getElementById('selfie-canvas');
    const takeSelfieButton = document.getElementById('take-selfie');
    const startWebcamButton = document.getElementById('start-webcam');
    const selfiePreview = document.getElementById('selfie-preview');
    const retakeSelfieButton = document.getElementById('retake-selfie');
    const quizContainer = document.getElementById('quiz-container');

    let currentStream;
    let questions = [];
    let currentQuestionIndex = 0;

    startWebcamButton.addEventListener('click', async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            webcamPreview.srcObject = stream;
            currentStream = stream;
            webcamPreview.style.display = 'block';
            startWebcamButton.style.display = 'none';
            takeSelfieButton.style.display = 'block';
            selfieContainer.querySelector('h2').textContent = "Posicione-se para a selfie:";
        } catch (err) {
            console.error("Erro ao acessar a câmera: ", err);
            alert("Não foi possível acessar a câmera. Por favor, verifique as permissões.");
        }
    });

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

        saveSelfie(dataUrl);

        selfieContainer.style.display = 'none';
        quizContainer.style.display = 'block';
        loadQuestions();
    });

    retakeSelfieButton.addEventListener('click', async () => {
        selfiePreview.style.display = 'none';
        retakeSelfieButton.style.display = 'none';
        selfieContainer.querySelector('h2').textContent = "Tire uma selfie para começar!";
        startWebcamButton.click();
    });

    function stopWebcam() {
        if (currentStream) {
            currentStream.getTracks().forEach(track => track.stop());
            webcamPreview.srcObject = null;
        }
    }

    function saveSelfie(dataUrl) {
        let selfies = JSON.parse(localStorage.getItem('selfies') || '[]');
        selfies.push(dataUrl);
        localStorage.setItem('selfies', JSON.stringify(selfies));
        console.log("Selfie salva no localStorage.");
    }

    async function loadQuestions() {
        try {
            const storedQuestions = localStorage.getItem('quizQuestions');
            if (storedQuestions) {
                questions = JSON.parse(storedQuestions);
            } else {
                questions = [];
            }

            if (questions.length > 0) {
                showQuestion();
            } else {
                questionElement.textContent = "Nenhuma pergunta disponível. Adicione perguntas no painel de administração.";
                answersElement.innerHTML = "";
                nextButton.style.display = 'none';
            }
        } catch (error) {
            console.error('Erro ao carregar perguntas:', error);
            questionElement.textContent = "Erro ao carregar o quiz. Tente novamente mais tarde.";
            answersElement.innerHTML = "";
            nextButton.style.display = 'none';
        }
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