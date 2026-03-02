package de.csiem.backend.service;

import java.time.Instant;
import java.util.List;

public interface MemorySplittingService {

    List<SplitMemory> split(String transcript, Instant uploadTimestamp);
}
