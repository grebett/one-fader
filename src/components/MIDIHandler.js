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

const PROXY_ENABLED = false;
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

const setCallbackOnTick = ({ durationMs, loop } = { loop: false }) => callback => {
  const tick = durationMs / 127;
  let pos = 0;
  let i = 0;
  let way = 1;
  let hasBounced = false;
  const withLoopCallback = () => {
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
  const interval = setInterval(withLoopCallback, tick);
  withLoopCallback();
  return () => clearInterval(interval);
};

const computeCCAndSendToIACDriverBuses = (cursor, editor, IACDriverBuses) => {
  const { CC, instrument, channels, MIDIValues } = editor;
  const outputValue = MIDIValues[cursor];
  const output = IACDriverBuses[parseInt(instrument, 10) - 1];
  const outputCC = parseInt(CC, 10);
  DEBUG && console.log(output, outputValue);
  output.sendControlChange(outputCC, outputValue, channels.toString().split(','));
};

//////////////
// Component
//////////////
const MIDIHandler = () => {
  let store = null;

  midi.enable(err => {
    if (err) {
      console.log('WebMidi could not be enabled.', err);
      return;
    }

    // 0] get all 32 inputs and 32 outputs
    const divisimatePorts = getDivisimatePorts(32);
    const IACDriverBuses = getIACDriverBuses(32);

    // midi.inputs.forEach(input => console.log(input.name));
    // midi.outputs.forEach(output => console.log(output.name));

    // One Fader to rule them all, One Fader to find them,
    // One Fader to bring them all and in the music bind them
    // In the Land of MIDI where the CCs lie.
    const main = () => {
      const controllers = getControllers(config.controllers);
      const editors = store.getState().app.curveEditors;
      if (!controllers.length) {
        throw new Error(
          'No input controller has been found. Please check if the one you want to use are properly set connected and listed in the config.json file.',
        );
      }
      if (!editors.length) {
        throw new Error('No editor has been found. Check the App component...');
      }

      // 0] INIT
      // a) clean previously attached events
      controllers.forEach(controller => controller.removeListener('controlchange', 'all'));
      controllers.forEach(controller => controller.removeListener('noteoff', 'all'));
      controllers.forEach(controller => controller.removeListener('noteon', 'all'));
      divisimatePorts.forEach(input => input.removeListener('midimessage', 'all'));
      divisimatePorts.forEach(input => input.removeListener('noteon', 'all'));
      divisimatePorts.forEach(input => input.removeListener('noteoff', 'all'));

      // b) pre-sort editors to optimize computation when midi events occur
      const fillArray = n =>
        Array(n)
          .fill(0)
          .map(() => []);
      const noteTriggeredEditors = {
        noteon: fillArray(32),
        noteoff: fillArray(32),
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
            editors.forEach(
              editor =>
                !editor.duration && computeCCAndSendToIACDriverBuses(inputValue, editor, IACDriverBuses),
            );
          }
        });
      };
      ONE_FADER_ENABLED && controllers.forEach(controller => bindControlChange(controller, editors));

      // 2] Note triggered CCs
      // for every editor which is note triggered, on note-on/note-off messages
      // compute the CC value and send it to IAC Driver Buses
      // the position of the cursor is updated every tick (tempo synced duration / 127)
      // until the note-off event occurs, three behaviors are possible when the end of the curve is rech
      // a) no more events are sent
      // b) the cursor start again from the begining and goes forward
      // c) the cursor goes backward, then when it reaches the beginning, goes forward again, and so on
      const noteOnCancelCallbacks = fillArray(127);
      const noteOffCancelCallbacks = fillArray(127);
      const bindHandleNoteOnNoteOff = voice => ({ type, note, velocity, channel }) => {
        const noteOffTriggeredEditors = noteTriggeredEditors.noteoff;
        const noteOnTriggeredEditors = noteTriggeredEditors.noteon;
        if (type === 'noteon') {
          // stop note-off curves
          noteOffCancelCallbacks[note.number].forEach(cb => cb()); // and force send noteoff
          noteOffCancelCallbacks[note.number] = [];
          // start note-on curves
          noteOnTriggeredEditors[voice].forEach(editor => {
            const { duration, loop } = editor;
            const callbackOnTick = setCallbackOnTick({
              durationMs: durationtoMs({ BPM: 60, duration }),
              loop,
            });
            const cancelCallbackOnTick = callbackOnTick(cursor =>
              computeCCAndSendToIACDriverBuses(cursor, editor, IACDriverBuses),
            );
            noteOnCancelCallbacks[note.number].push(cancelCallbackOnTick);
          });
          // send note on
          console.log('playing note', note, velocity);
          IACDriverBuses[voice].playNote(note.number, channel, { velocity });
        } else if (type === 'noteoff') {
          // start note-off curves
          if (noteOffTriggeredEditors[voice].length) {
            let maxDuration = 0;
            noteOffTriggeredEditors[voice].forEach(editor => {
              const { duration, loop } = editor;
              const durationMs = durationtoMs({ BPM: 60, duration });
              const callbackOnTick = setCallbackOnTick({ durationMs, loop });
              const cancelCallbackOnTick = callbackOnTick(cursor =>
                computeCCAndSendToIACDriverBuses(cursor, editor, IACDriverBuses),
              );
              noteOffTriggeredEditors[note.number].push(cancelCallbackOnTick);
              if (durationMs > maxDuration) {
                maxDuration = durationMs;
              }
              console.log(maxDuration);
            });
            // postpone note-off at the end of the longest curve
            setTimeout(
              () =>
                console.log('sending noteoff') ||
                IACDriverBuses[voice].playNote(note.number, channel, { velocity }),
              maxDuration,
            );
          } else {
            // send note off
            console.log('playing note', note, velocity);
            IACDriverBuses[voice].playNote(note.number, channel, { velocity });
            // stop note-on curves
            noteOnCancelCallbacks[note.number].forEach(cb => cb());
            noteOnCancelCallbacks[note.number] = [];
          }
        }
        // PROXY, never here so far
        else {
          IACDriverBuses[voice].playNote(note.number, channel, { velocity });
          console.log('playing note', note, velocity);
        }
        // switch (type) {
        //   case 'noteon':
        //     }
        //     break;
        //   case 'noteoff':
        //     playingNotes[note.number]();
        //     playingNotes[note.number] = null;
        //     break;
        //   default:
        //     console.warn(`${type} isn't recognized. Are you sure you're using noteon or noteoff events?`);
        // }
      };
      if (NOTE_TRIGGERED_ENABLED) {
        divisimatePorts.forEach((input, i) => {
          const handleNoteOnNoteOff = bindHandleNoteOnNoteOff(i);
          input.addListener('noteon', 'all', handleNoteOnNoteOff);
          input.addListener('noteoff', 'all', handleNoteOnNoteOff);
        });
      }
    };

    main();
    store.subscribe(main);
  });

  return reduxStore => (store = reduxStore);
};

export { MIDIHandler };
