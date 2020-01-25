import midi from 'webmidi';
import config from '../config/config.json';

//////////
// TODO
//////////
// 1) So far we assume all IAC Driver Buses and Divisimate Ports are correctly orderded (1 <==> 1, 2 <==> 2, etc)
//    We should check if this is true, or throw an error ; or we could rearrange the array ourself, but much more work

//////////////////
// FEATURE FLAGS
//////////////////

const DEBUG = true;
const ONE_FADER_ENABLED = true;
const NOTE_TRIGGERED_ENABLED = true;

//////////
// UTILS
//////////
const getDivisimatePorts = n => {
  const padding = n => (n < 10 ? `0${n}` : n);
  return Array(n)
    .fill(0)
    .map((_, i) => {
      const name = `Divisimate Port ${padding(i + 1)}`;
      const input = midi.getInputByName(name);
      if (!input) {
        throw new Error(`${name} hasn't been found. Check if Divisimate is launched and properly set up.`);
      }
      return input;
    });
};

const getIACDriverBuses = n => {
  return Array(n)
    .fill(0)
    .map((_, i) => {
      const name = `IAC Driver Bus ${i + 1}`;
      const output = midi.getOutputByName(name);
      if (!output) {
        throw new Error(`${name} hasn't been found. Check if IAC Driver Buses are properly set up.`);
      }
      return output;
    });
};

const getControllers = controllers => {
  return controllers
    .map(controller => {
      const input = midi.getInputByName(controller);
      if (!input) {
        console.warn(
          `${controller} hasn't been found. Check if controller is properly connected or update config.json accordingly.`,
        );
      }
      return input;
    })
    .filter(controller => controller);
};

// duration => in beat (eg. in a 4/4 signature, 4 gives a full-bar length, 1/4 a quarter, etc.)
// BPM => beats per minute ; set globally or per editor
// TODO: improve perfs and get rid of the if forest
const durationtoMs = ({ BPM, duration } = { BPM: 60 }) => (60 / BPM) * 1000 * duration;

const setCallbackOnTick = ({ durationMs, loop } = { loop: false }, callback) => {
  const tick = durationMs / 127;
  let pos = 0;
  let i = 0;
  let way = 1;
  let hasBounced = false;
  let interval = null;
  const callbackOnTick = () => {
    if (pos >= durationMs || (hasBounced && Math.floor(pos) <= 0)) {
      if (!loop) {
        clearInterval(interval);
        return;
      } else {
        if (loop === 'restart') {
          pos = -tick;
          i = -1;
        } else if (loop === 'bounce') {
          hasBounced = true;
          way *= -1;
        }
      }
    }
    pos += tick * way;
    i += way;
    callback(i);
  };
  interval = setInterval(callbackOnTick, tick);
  callbackOnTick();
  return () => clearInterval(interval);
};

const computeCCAndSendToIACDriverBuses = (cursor, editor, IACDriverBuses) => {
  const { CC, instrument, channels, MIDIValues } = editor;
  const outputValue = MIDIValues[cursor];
  const output = IACDriverBuses[parseInt(instrument, 10) - 1];
  const outputCC = parseInt(CC, 10);
  DEBUG && console.log('➡️', output.name, outputValue);
  output.sendControlChange(outputCC, outputValue, channels.toString().split(','));
};

const twoDimensionalArray = n =>
  Array(n)
    .fill(0)
    .map(() => []);

//////////////
// Component
//////////////
const MIDIHandler = () => {
  let store = null;

  midi.enable(err => {
    if (err) {
      throw new Error('WebMidi could not be enabled.', err);
    }

    // 0a] get all 32 inputs and 32 outputs and controllers
    const divisimatePorts = getDivisimatePorts(32);
    const IACDriverBuses = getIACDriverBuses(32);
    const controllers = getControllers(config.controllers);
    // 0b] keep a reference of all ticking callbacks killer functions (roughly cancelInterval functions)
    const noteOnTickingCallbacksKillers = twoDimensionalArray(127);
    const noteOffTickingCallbacksKillers = twoDimensionalArray(127);
    let noteOffclearTimeouts = [];

    // midi.inputs.forEach(input => console.log(input.name));
    // midi.outputs.forEach(output => console.log(output.name));

    // One Fader to rule them all, One Fader to find them,
    // One Fader to bring them all and in the music bind them
    // In the Land of MIDI where the CCs lie.
    const main = () => {
      const editors = store.getState().app.curveEditors; // updated with every change to the store
      if (!controllers.length) {
        throw new Error(
          'No input controller has been found. Please check if the one you want to use are properly set connected and listed in the config.json file.',
        );
      }
      if (!editors.length) {
        throw new Error('No editor has been found. Check the App component...');
      }

      // 0] INIT (we want to start fresh after a param has been changed in the editors GUI)
      // a) clean previously attached events and kill all ticking callbacks
      DEBUG && console.log('🧹starting cleaning everything');
      controllers.forEach(controller => controller.removeListener('controlchange', 'all'));
      divisimatePorts.forEach(input => input.removeListener('noteon', 'all'));
      divisimatePorts.forEach(input => input.removeListener('noteoff', 'all'));
      for (let i = 0; i < 127; i++) {
        noteOnTickingCallbacksKillers[i].forEach(cb => cb());
        noteOffTickingCallbacksKillers[i].forEach(cb => cb());
      }
      noteOffclearTimeouts.forEach((clearTimeoutFunction, noteNumber) => {
        if (clearTimeoutFunction) {
          clearTimeoutFunction();
          IACDriverBuses.forEach(output => output.playNote(noteNumber, 'all', { velocity: 0 }));
        }
      });
      noteOffclearTimeouts = [];

      // b) pre-sort editors to optimize computation when midi events occur
      const noteTriggeredEditors = {
        noteon: twoDimensionalArray(32),
        noteoff: twoDimensionalArray(32),
      };
      const faderTriggeredEditors = [];
      editors.forEach(editor => {
        if (!editor.duration) {
          faderTriggeredEditors.push(editor);
          return;
        }
        const i = parseInt(editor.instrument, 10) - 1;
        noteTriggeredEditors[editor.noteEvent][i].push(editor);
      });

      // 1] One-Fader
      // on CC1, ch1, from one of the controller
      // compute the CC value for every editor which is fader triggered and send it to IAC Driver Buses
      // the one-fader controls the position of the cursor in the curve
      const bindControlChange = (controller, editors) => {
        controller.addListener('controlchange', 'all', ({ data }) => {
          const [, inputCC, inputValue] = data;
          if (controller.getCcNameByNumber(inputCC) === 'modulationwheelcoarse') {
            editors.forEach(editor => computeCCAndSendToIACDriverBuses(inputValue, editor, IACDriverBuses));
          }
        });
      };
      ONE_FADER_ENABLED &&
        controllers.forEach(controller => bindControlChange(controller, faderTriggeredEditors));

      // 2] Note triggered CCs
      const startTickingCallback = (editor, note, callbacksKillersArray) => {
        const { duration, loop } = editor;
        const durationMs = durationtoMs({ BPM: 60, duration });
        const cancelCallbackOnTick = setCallbackOnTick({ durationMs, loop }, cursor =>
          computeCCAndSendToIACDriverBuses(cursor, editor, IACDriverBuses),
        );
        callbacksKillersArray[note.number].push(cancelCallbackOnTick);
        return durationMs;
      };
      const createNoteonNoteoffHandlerForEachVoice = voice => ({ type, note, velocity, channel }) => {
        const noteOffTriggeredEditors = noteTriggeredEditors.noteoff;
        const noteOnTriggeredEditors = noteTriggeredEditors.noteon;
        if (type === 'noteon') {
          DEBUG && console.log('📀noteon has been called');
          // send noteoff if some noteoff curve editor has postponed it and clear everything
          if (noteOffclearTimeouts[note.number]) {
            DEBUG &&
              console.log(
                '🎹playing noteoff because there was a pending noteoff',
                IACDriverBuses[voice].name,
                note,
                velocity,
              );
            IACDriverBuses[voice].playNote(note.number, channel, { velocity: 0 });
            noteOffclearTimeouts[note.number]();
            noteOffclearTimeouts[note.number] = null;
          }
          // stop existing noteoff curves
          noteOffTickingCallbacksKillers[note.number].forEach(cb => cb());
          noteOffTickingCallbacksKillers[note.number] = [];
          // start note-on curves
          noteOnTriggeredEditors[voice].forEach(editor =>
            startTickingCallback(editor, note, noteOnTickingCallbacksKillers),
          );
          // send note on
          DEBUG && console.log('🎹playing noteon', IACDriverBuses[voice].name, note, velocity);
          IACDriverBuses[voice].playNote(note.number, channel, { velocity });
        } else if (type === 'noteoff') {
          DEBUG && console.log('📀noteoff has been called');
          // start note-off curves
          if (noteOffTriggeredEditors[voice].length) {
            let maxDuration = 0;
            noteOffTriggeredEditors[voice].forEach(editor => {
              const durationMs = startTickingCallback(editor, note, noteOffTickingCallbacksKillers);
              if (durationMs > maxDuration) {
                maxDuration = durationMs;
              }
            });
            // postpone note-off at the end of the longest curve
            const timeout = setTimeout(() => {
              DEBUG &&
                console.log(
                  `🎹playing noteoff after a timeout of ${maxDuration}`,
                  IACDriverBuses[voice].name,
                  note,
                  0,
                );
              IACDriverBuses[voice].playNote(note.number, channel, { velocity: 0 });
            }, maxDuration);
            noteOffclearTimeouts[note.number] = () => clearTimeout(timeout);
          } else {
            // send note off
            DEBUG && console.log('🎹playing noteoff', IACDriverBuses[voice].name, note, 0); // interestingly, some controllers can send velocity values > than 0 on noteoff (release velocity)
            IACDriverBuses[voice].playNote(note.number, channel, { velocity: 0 });
            // stop note-on curves
            noteOnTickingCallbacksKillers[note.number].forEach(cb => cb());
            noteOnTickingCallbacksKillers[note.number] = [];
          }
        }
      };

      NOTE_TRIGGERED_ENABLED &&
        divisimatePorts.forEach((input, voice) => {
          const handleNoteOnNoteOff = createNoteonNoteoffHandlerForEachVoice(voice);
          input.addListener('noteon', 'all', handleNoteOnNoteOff);
          input.addListener('noteoff', 'all', handleNoteOnNoteOff);
        });
    };

    main();
    store.subscribe(main);
  });

  return reduxStore => (store = reduxStore);
};

export { MIDIHandler };
