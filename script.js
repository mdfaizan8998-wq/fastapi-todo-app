const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

if (SpeechRecognition) {
    const recognition = new SpeechRecognition();
    recognition.lang = 'hi-IN'; // Multi-language detection ke liye baseline
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    const micBtn = document.getElementById('micBtn');
    const taskInput = document.getElementById('taskInput');

    // Mic Click Event
    micBtn.addEventListener('click', function (e) {
        e.preventDefault();
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

    // Jab bolna poora ho jaye
    recognition.onresult = async function (event) {
        const voiceText = event.results[0][0].transcript;
        taskInput.value = voiceText;
        resetMicButton();

        if (voiceText.trim() !== "") {
            taskInput.placeholder = "Zara is processing... ⚡";
            await sendToZara(voiceText);
        }
    };

    recognition.onerror = function () { resetMicButton(); };
    recognition.onend = function () { resetMicButton(); };

    function resetMicButton() {
        micBtn.innerHTML = 'zara🎤';
        micBtn.style.background = '';
        micBtn.style.color = '';
    }

    // AJAX Call to Backend (No Reload Flow)
    async function sendToZara(text) {
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
                    // 1. Agar naya task create hua hai, toh use list mein bina refresh ke add karo
                    if (data.type === "task") {
                        const taskList = document.querySelector('.task-list');
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

                        // Pehla placeholder 'No tasks yet' agar ho toh use hata do
                        if (taskList.innerHTML.includes("No tasks yet")) {
                            taskList.innerHTML = newTaskHTML;
                        } else {
                            taskList.insertAdjacentHTML('afterbegin', newTaskHTML);
                        }
                    }

                    // 2. Zara ko turant usi language mein bolne ke liye bhejo
                    if (data.speak_text) {
                        speakInUserLanguage(data.speak_text);
                    }
                }
                taskInput.placeholder = "Ask Me Question And I also Suggest You Description";
                taskInput.value = ""; // Textarea ko clean karo
            }
        } catch (err) {
            console.error("Error:", err);
            taskInput.placeholder = "Server connection error!";
        }
    }

    // Dynamic Multi-Language Speaker
    function speakInUserLanguage(text) {
        window.speechSynthesis.cancel(); // Stop any current audio

        const utterance = new SpeechSynthesisUtterance(text);
        const voices = window.speechSynthesis.getVoices();

        // Script matching regex pattern for Punjabi and Hindi/Bhojpuri
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
            // Default English / Hinglish
            utterance.lang = 'en-IN';
            const voice = voices.find(v => v.lang.includes('en-IN') || v.name.includes('India'));
            if (voice) utterance.voice = voice;
        }

        utterance.rate = 1.05; // Keep speech natural and slight responsive fast
        window.speechSynthesis.speak(utterance);
    }
} else {
    alert("Speech recognition not supported! Try Google Chrome.");
}