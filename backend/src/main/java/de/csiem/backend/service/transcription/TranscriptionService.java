package de.csiem.backend.service.transcription;

public interface TranscriptionService {

    String transcribe(byte[] audioBytes, String filename, String contentType);
}
