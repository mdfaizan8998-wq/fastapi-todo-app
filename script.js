const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
d
if (SpeechRecognition) {
    const recognition = new SpeechRecognition();
    recognition.lang = 'hi-IN'; // Baseline for multi-language
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    const micBtn = document.getElementById('micBtn');
    const taskInput = document.getElementById('taskInput');
    const aiForm = document.getElementById('aiForm');

    // ==========================================
    // 1. MIC CLICK EVENT (VOICE INPUT)
    // ==========================================
    micBtn.addEventListener('click', function (e) {
        e.preventDefault();

        // Browsers ki restriction bypass karne ke liye pehle hi TTS active state trigger kar rahe hain
        if (window.speechSynthesis.paused) {
            window.speechSynthesis.resume();
        }

        try {
            recognition.start();
            micBtn.innerHTML = 'Listening... 🔴';
            micBtn.style.background = 'rgba(239, 68, 68, 0.2)';
            micBtn.style.color = '#ef4444';
            taskInput.placeholder = "Zara is listening... Boliye!";
        } catch (error) {
            console.log("Recognition error or already running:", error);
        }
    });

    // Jab voice typing complete ho jaye
    recognition.onresult = async function (event) {
        const voiceText = event.results[0][0].transcript;
        taskInput.value = voiceText;
        resetMicButton();

        if (voiceText.trim() !== "") {
            taskInput.placeholder = "Zara is processing... ⚡";
            await processZaraRequest(voiceText); // Submit directly via AJAX
        }
    };

    recognition.onerror = function () { resetMicButton(); };
    recognition.onend = function () { resetMicButton(); };

    function resetMicButton() {
        micBtn.innerHTML = 'zara🎤';
        micBtn.style.background = '';
        micBtn.style.color = '';
    }

    // ==========================================
    // 2. TEXT FORM SUBMIT EVENT ("ASK ME" BUTTON)
    // ==========================================
    if (aiForm) {
        aiForm.addEventListener('submit', async function (e) {
            e.preventDefault(); // Page reload stop kiya
            const textValue = taskInput.value.trim();

            if (textValue !== "") {
                taskInput.placeholder = "Zara is processing... ⚡";
                await processZaraRequest(textValue);
            }
        });
    }

    // ==========================================
    // 3. CORE AJAX & DOM MANIPULATION FUNCTION
    // ==========================================
    async function processZaraRequest(text) {
        const formData = new FormData();
        formData.append('text', text);

        try {
            const response = await fetch('/ai_create_task', {
                method: 'POST',
                body: formData
            });

            if (response.ok) {
                const data = await response.json();

                if (data.status === "success") {

                    // --- BHEECH SE STATS WALA BOX HIDE KARNA ---
                    const statsBox = document.querySelector('.stats');
                    if (statsBox) {
                        statsBox.style.display = 'none'; // Stats block gayab!
                    }

                    // --- PURANE AI ANSWERS KO CLEAR KARNA ---
                    const oldAiResults = document.querySelectorAll('.ai-result');
                    oldAiResults.forEach(el => el.remove());

                    const taskList = document.querySelector('.task-list');

                    // CASE A: Agar AI ne koi naya Task bana kar diya hai
                    if (data.type === "task") {
                        const newTaskHTML = `
                            <div class="task">
                                <div class="task-left">
                                    <div class="task-content">
                                        <h3>${data.title}</h3>
                                        <p>${data.description}</p>
                                        <div class="task-meta">
                                            <span>Status: normal</span>
                                            <span>Due: No date</span>
                                        </div>
                                    </div>
                                </div>
                            </div>`;

                        if (taskList.innerHTML.includes("No tasks yet")) {
                            taskList.innerHTML = newTaskHTML;
                        } else {
                            taskList.insertAdjacentHTML('afterbegin', newTaskHTML);
                        }
                    }

                    // CASE B: Agar AI ne koi seedha Answer diya hai (Question-Answering)
                    else if (data.type === "answer" || data.ai_answer) {
                        const answerHTML = `
                            <div class="ai-result" style="animation: fadeIn 0.5s ease;">
                                <h3>AI Answer</h3>
                                <p>${data.ai_answer || data.answer}</p>
                            </div>`;

                        // Isko task list ke sabse upar push karo taaki user ko turant dikhe
                        taskList.insertAdjacentHTML('afterbegin', answerHTML);
                    }

                    // --- VOICE AUDIO SPEECH OUTPUT ---
                    if (data.speak_text) {
                        speakInUserLanguage(data.speak_text);
                    }
                }

                // Textarea setup back to normal
                taskInput.placeholder = "Ask Me Question And I also Suggest You Description";
                taskInput.value = "";
            }
        } catch (err) {
            console.error("Error:", err);
            taskInput.placeholder = "Server connection error!";
        }
    }

    // ==========================================
    // 4. MULTI-LANGUAGE SPEAKER (TTS WITH AUTOPLAY FIX)
    // ==========================================
    function speakInUserLanguage(text) {
        // Agar tab block state me ho, toh forces-clear aur resume activate karein
        if (window.speechSynthesis.paused) {
            window.speechSynthesis.resume();
        }
        window.speechSynthesis.cancel(); // Stop any previous audio overlay

        const utterance = new SpeechSynthesisUtterance(text);
        const voices = window.speechSynthesis.getVoices();

        const isPunjabi = /[\u0A00-\u0A7F]/.test(text);
        const isHindiOrBhojpuri = /[\u0900-\u097F]/.test(text);

        if (isPunjabi) {
            utterance.lang = 'pa-IN';
            const voice = voices.find(v => v.lang.includes('pa-IN'));
            if (voice) utterance.voice = voice;
        } else if (isHindiOrBhojpuri) {
            utterance.lang = 'hi-IN';
            const voice = voices.find(v => v.lang.includes('hi-IN') || v.name.includes('Google ID-Hindi'));
            if (voice) utterance.voice = voice;
        } else {
            utterance.lang = 'en-IN';
            const voice = voices.find(v => v.lang.includes('en-IN') || v.name.includes('India'));
            if (voice) utterance.voice = voice;
        }

        utterance.rate = 1.05;

        // Debug check (F12 daba kar check karne ke liye)
        console.log("🔊 Zara Triggered Speech text:", text);

        window.speechSynthesis.speak(utterance);
    }
} else {
    alert("Speech recognition not supported! Try Google Chrome.");
}
