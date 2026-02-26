package de.csiem.backend.memory.transcription;

public interface TranscriptionService {

    String transcribe(byte[] audioBytes, String filename, String contentType);
}
