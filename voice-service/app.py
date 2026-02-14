from flask import Flask, request, jsonify, send_file
from resemblyzer import VoiceEncoder, preprocess_wav
import numpy as np
import os
from tempfile import NamedTemporaryFile
from flask_cors import CORS
import subprocess
from TTS.api import TTS as CoquiTTS
from vosk import Model, KaldiRecognizer
import wave
import json
import logging
import traceback
import ast

app = Flask(__name__)
CORS(app)
encoder = VoiceEncoder()

# --- Model Initialization ---
try:
    tts_model = CoquiTTS(model_name="tts_models/en/ljspeech/tacotron2-DDC")
except Exception as e:
    logging.error(f"Failed to load CoquiTTS model: {e}")
    tts_model = None

try:
    vosk_model = Model(model_name="vosk-model-small-en-us-0.15")
except Exception as e:
    logging.error(f"Failed to load Vosk model: {e}")
    vosk_model = None

if not os.path.exists('audio'):
    os.makedirs('audio')

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')


def convert_audio_to_wav(input_file_path):
    temp_wav_path = os.path.splitext(input_file_path)[0] + ".wav"
    ffmpeg_cmd = [
        "ffmpeg", "-y",
        "-i", input_file_path,
        "-ar", "16000",
        "-ac", "1",
        "-acodec", "pcm_s16le",
        temp_wav_path
    ]
    try:
        subprocess.run(ffmpeg_cmd, check=True, capture_output=True, text=True)
    except subprocess.CalledProcessError as e:
        app.logger.error(f"FFmpeg failed: {e.stderr}")
        raise
    return temp_wav_path


@app.route('/embed', methods=['POST'])
def embed():
    if 'audio' not in request.files:
        return jsonify({'success': False, 'error': 'No audio file part in the request.'}), 400

    audio_file = request.files['audio']
    temp_input_path = None
    wav_path = None

    try:
        with NamedTemporaryFile(delete=False, suffix=os.path.splitext(audio_file.filename)[1] or ".webm") as temp_input_file:
            audio_file.save(temp_input_file.name)
            temp_input_path = temp_input_file.name

        wav_path = convert_audio_to_wav(temp_input_path)
        wav = preprocess_wav(wav_path)
        embedding = encoder.embed_utterance(wav)

        return jsonify({"success": True, "embedding": embedding.tolist()})

    except Exception as e:
        app.logger.error(f"Error in /embed: {str(e)}")
        app.logger.error(traceback.format_exc())
        return jsonify({'success': False, 'error': 'Failed to generate embedding.', 'details': str(e)}), 500
    finally:
        if temp_input_path and os.path.exists(temp_input_path):
            os.remove(temp_input_path)
        if wav_path and os.path.exists(wav_path):
            os.remove(wav_path)


@app.route('/verify', methods=['POST'])
def verify():
    if 'audio' not in request.files:
        return jsonify({'success': False, 'message': 'No audio file part in the request.'}), 400

    stored_embedding_str = request.form.get('stored_embedding')
    if not stored_embedding_str:
        return jsonify({'success': False, 'message': 'No stored_embedding provided.'}), 400

    audio_file = request.files['audio']
    temp_input_path = None
    wav_path = None

    try:
        stored_embedding = np.array(ast.literal_eval(stored_embedding_str))

        with NamedTemporaryFile(delete=False, suffix=os.path.splitext(audio_file.filename)[1] or ".webm") as temp_input_file:
            audio_file.save(temp_input_file.name)
            temp_input_path = temp_input_file.name

        wav_path = convert_audio_to_wav(temp_input_path)
        wav = preprocess_wav(wav_path)
        new_embedding = encoder.embed_utterance(wav)

        similarity = np.dot(stored_embedding, new_embedding) / (
            np.linalg.norm(stored_embedding) * np.linalg.norm(new_embedding)
        )
        is_match = similarity > 0.50

        app.logger.info(f"Voice verification {'passed ✅' if is_match else 'failed ❌'} with similarity {similarity:.2f}")

        return jsonify({
            'success': True,
            'similarity': float(similarity),
            'isMatch': bool(is_match),
            'message': 'Voice verification successful' if is_match else 'Voice verification failed'
        }), 200

    except Exception as e:
        app.logger.error(f"Error in /verify: {str(e)}")
        app.logger.error(traceback.format_exc())
        return jsonify({'success': False, 'message': 'Failed to verify voice.', 'error': str(e)}), 500
    finally:
        if temp_input_path and os.path.exists(temp_input_path):
            os.remove(temp_input_path)
        if wav_path and os.path.exists(wav_path):
            os.remove(wav_path)


@app.route('/stt', methods=['POST'])
def stt():
    if not vosk_model:
        return jsonify({'success': False, 'error': 'STT service is not available.'}), 503
    if 'audio' not in request.files:
        return jsonify({'success': False, 'error': 'No audio file part in the request.'}), 400

    audio_file = request.files['audio']
    temp_input_path = None
    wav_path = None

    try:
        with NamedTemporaryFile(delete=False, suffix=os.path.splitext(audio_file.filename)[1] or ".webm") as temp_input_file:
            audio_file.save(temp_input_file.name)
            temp_input_path = temp_input_file.name

        wav_path = convert_audio_to_wav(temp_input_path)

        text = ''
        with wave.open(wav_path, "rb") as wf:
            rec = KaldiRecognizer(vosk_model, wf.getframerate())
            rec.SetWords(True)

            while True:
                data = wf.readframes(4000)
                if len(data) == 0:
                    break
                rec.AcceptWaveform(data)

            final_result = json.loads(rec.FinalResult())
            text = final_result.get('text', '')

        return jsonify({'success': True, 'text': text})

    except Exception as e:
        app.logger.error(f"STT error: {str(e)}")
        app.logger.error(traceback.format_exc())
        return jsonify({'success': False, 'error': 'Failed to perform speech-to-text.', 'details': str(e)}), 500
    finally:
        if temp_input_path and os.path.exists(temp_input_path):
            os.remove(temp_input_path)
        if wav_path and os.path.exists(wav_path):
            os.remove(wav_path)


@app.route('/tts', methods=['POST'])
def tts():
    if not tts_model:
        return jsonify({'success': False, 'error': 'TTS service is not available.'}), 503
    try:
        data = request.get_json()
        text = data.get('text', '')
        if not text:
            return jsonify({'success': False, 'error': 'No text provided'}), 400

        output_path = os.path.join('audio', 'tts_output.wav')
        tts_model.tts_to_file(text=text, file_path=output_path)

        if not os.path.exists(output_path):
            return jsonify({'success': False, 'error': 'TTS output file was not created.'}), 500

        return send_file(output_path, mimetype='audio/wav')

    except Exception as e:
        app.logger.error('TTS endpoint error: ' + str(e))
        app.logger.error(traceback.format_exc())
        return jsonify({'success': False, 'error': str(e)}), 500


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5001))
    app.run(host="0.0.0.0", port=port)