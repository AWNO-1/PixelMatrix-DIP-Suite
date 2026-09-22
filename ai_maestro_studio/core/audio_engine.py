"""
Unified Audio Engine for AI Maestro Studio
Wraps FluidSynth with multi-track MIDI playback, real-time tempo/volume modulation,
Windows DLL configuration, and active note tracking for reactive visualizers.
"""

import os
import sys
import glob
import time
import math
import threading
import fluidsynth
import pretty_midi
import numpy as np

# Ensure Windows finds fluidsynth DLLs from studio's bin folder
_CORE_DIR = os.path.dirname(os.path.abspath(__file__))
_STUDIO_DIR = os.path.dirname(_CORE_DIR)
BIN_DIR = os.path.join(_STUDIO_DIR, 'bin')

if sys.platform == 'win32':
    for dll_dir in [BIN_DIR, r'C:\tools\fluidsynth\bin', _STUDIO_DIR]:
        if os.path.isdir(dll_dir):
            try:
                os.add_dll_directory(dll_dir)
            except Exception:
                pass
            if dll_dir not in os.environ.get('PATH', ''):
                os.environ['PATH'] = dll_dir + ';' + os.environ.get('PATH', '')


class EnhancedOrchestraEngine:
    """Robust, multi-track MIDI Orchestra synthesizer with dynamic tempo, volume, and live note monitoring."""
    def __init__(self, soundfont_path, playlist_source):
        self.soundfont_path = soundfont_path
        
        # Determine playlist
        if os.path.isdir(playlist_source):
            self.playlist = sorted(glob.glob(os.path.join(playlist_source, '*.mid')))
            if not self.playlist:
                fallback = os.path.join(_STUDIO_DIR, 'assets', 'orchestra.mid')
                self.playlist = [fallback]
        else:
            self.playlist = [playlist_source]

        self.current_track_idx = 0
        self.tempo_scale = 1.00
        self.volume = 0.85
        self.playing = True
        self.paused = False
        self.current_time = 0.0
        self.notes = []
        self.note_index = 0
        self.total_duration = 1.0
        self.active_notes_count = 0
        self.lock = threading.Lock()

        # Initialize FluidSynth
        self.fs = fluidsynth.Synth(gain=0.55)
        self.fs.setting('synth.polyphony', 256)
        self.fs.setting('synth.cpu-cores', 4)

        driver = 'coreaudio' if sys.platform == 'darwin' else 'dsound'
        try:
            self.fs.start(driver=driver)
        except Exception:
            self.fs.start()

        self.sfid = self.fs.sfload(soundfont_path)
        self.fs.program_reset()

        self._load_current_song()

        self._thread = threading.Thread(target=self._playback_loop, daemon=True)
        self._thread.start()

    def _load_current_song(self):
        with self.lock:
            midi_path = self.playlist[self.current_track_idx]
            self.midi = pretty_midi.PrettyMIDI(midi_path)
            self.total_duration = max(1.0, self.midi.get_end_time())

            raw_name = os.path.splitext(os.path.basename(midi_path))[0]
            clean_name = raw_name
            if len(raw_name) > 3 and raw_name[:2].isdigit() and raw_name[2] in ['_', '-']:
                clean_name = raw_name[3:]
            self.track_title = clean_name.replace('_', ' ').title()

            self.fs.system_reset()
            for i, instrument in enumerate(self.midi.instruments):
                if i >= 16:
                    break
                channel = 9 if instrument.is_drum else i
                self.fs.program_select(channel, self.sfid, 0, instrument.program)

            notes = []
            for i, instrument in enumerate(self.midi.instruments):
                if i >= 16:
                    break
                channel = 9 if instrument.is_drum else i
                for note in instrument.notes:
                    notes.append({
                        'start': note.start,
                        'end': note.end,
                        'pitch': note.pitch,
                        'velocity': note.velocity,
                        'channel': channel
                    })
            notes.sort(key=lambda x: x['start'])
            self.notes = notes
            self.note_index = 0
            self.current_time = 0.0
            self.active_notes_count = 0

    def _playback_loop(self):
        last_wall = time.time()
        while self.playing:
            now = time.time()
            delta_wall = now - last_wall
            last_wall = now

            if not self.paused:
                self.current_time += delta_wall * self.tempo_scale

                with self.lock:
                    if self.current_time >= self.total_duration:
                        self.current_time = 0.0
                        self.note_index = 0
                        self.fs.system_reset()
                        for i, instrument in enumerate(self.midi.instruments):
                            if i >= 16:
                                break
                            channel = 9 if instrument.is_drum else i
                            self.fs.program_select(channel, self.sfid, 0, instrument.program)

                    active_now = 0
                    while (self.note_index < len(self.notes) and
                           self.notes[self.note_index]['start'] <= self.current_time):
                        note = self.notes[self.note_index]
                        vel = int(note['velocity'] * self.volume)
                        vel = max(1, min(127, vel))
                        self.fs.noteon(note['channel'], note['pitch'], vel)
                        dur = max(0.04, (note['end'] - note['start']) / self.tempo_scale)
                        threading.Timer(dur, self._note_off, args=[note['channel'], note['pitch']]).start()
                        self.note_index += 1
                        active_now += 1

                    if active_now > 0:
                        self.active_notes_count = max(self.active_notes_count, active_now)
                    else:
                        self.active_notes_count = max(0, self.active_notes_count - 1)

            time.sleep(0.005)

    def _note_off(self, channel, pitch):
        if self.playing:
            try:
                self.fs.noteoff(channel, pitch)
            except Exception:
                pass

    def next_track(self):
        with self.lock:
            self.current_track_idx = (self.current_track_idx + 1) % len(self.playlist)
        self._load_current_song()

    def prev_track(self):
        with self.lock:
            self.current_track_idx = (self.current_track_idx - 1) % len(self.playlist)
        self._load_current_song()

    def set_tempo(self, scale):
        self.tempo_scale = max(0.50, min(2.00, scale))

    def set_volume(self, vol):
        self.volume = max(0.00, min(1.00, vol))

    def increase_tempo(self, amount=0.15):
        self.set_tempo(self.tempo_scale + amount)

    def decrease_tempo(self, amount=0.15):
        self.set_tempo(self.tempo_scale - amount)

    def increase_volume(self, amount=0.15):
        self.set_volume(self.volume + amount)

    def decrease_volume(self, amount=0.15):
        self.set_volume(self.volume - amount)

    def silence(self):
        with self.lock:
            self.fs.system_reset()
            for i, instrument in enumerate(self.midi.instruments):
                if i >= 16:
                    break
                channel = 9 if instrument.is_drum else i
                self.fs.program_select(channel, self.sfid, 0, instrument.program)
        self.active_notes_count = 0

    def toggle_pause(self):
        self.paused = not self.paused
        if self.paused:
            self.silence()

    def stop(self):
        self.playing = False
        try:
            self.fs.system_reset()
            self.fs.delete()
        except Exception:
            pass
