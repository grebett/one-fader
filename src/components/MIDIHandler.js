import midi from 'webmidi';
import config from '../config/config.json';

//////////////////
// FEATURE FLAGS
//////////////////

const PROXY_ENABLED = true;
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
const setCallbackOnTick = ({ BPM, duration, loop } = { BPM: 60, duration: 4, loop: false }) => callback => {
  const beatValue = (60 / BPM) * 1000;
  const bar = beatValue * duration;
  const tick = bar / 127;
  let pos = 0;
  let i = 0;
  let way = 1;
  let hasBounced = false;
  const withLoopCallback = () => {
    if (pos >= bar || (hasBounced && Math.floor(pos) <= 0)) {
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
  output.sendControlChange(outputCC, outputValue, channels.split(','));
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

      // -1] clean previously attached events
      controllers.forEach(controller => controller.removeListener('controlchange', 'all'));
      controllers.forEach(controller => controller.removeListener('noteoff', 'all'));
      controllers.forEach(controller => controller.removeListener('noteon', 'all'));
      divisimatePorts.forEach(input => input.removeListener('midimessage', 'all'));

      // 0] proxy all MIDI messages from Divisimate ports to according IAC Driver buses
      // Q? Should I proxy only the notes: for now, just ignore CC1
      const proxyAllMIDIMessages = (inputs, outputs) => {
        const formatMIDIOutMessage = data => [data[0], [data[1], data[2]]];
        inputs.forEach((input, i) =>
          input.addListener('midimessage', undefined, ({ data }) => {
            if (data[0] === 176 && data[1] === 1) {
              return;
            }
            outputs[i].send(...formatMIDIOutMessage(data));
          }),
        );
      };
      PROXY_ENABLED && proxyAllMIDIMessages(divisimatePorts, IACDriverBuses);

      // 1] One-Fader
      // on CC1, ch1, from one of the controller
      // compute the CC value for every editor which is fader triggered and send it to IAC Driver Buses
      // the one-fader controls the position of the cursor in the curve
      const onControlChange = (controller, editors) => {
        controller.addListener('controlchange', 'all', ({ data }) => {
          const [, inputCC, inputValue] = data;
          if (controller.getCcNameByNumber(inputCC) === 'modulationwheelcoarse') {
            editors.forEach(editor => computeCCAndSendToIACDriverBuses(inputValue, editor, IACDriverBuses));
          }
        });
      };
      ONE_FADER_ENABLED && controllers.forEach(controller => onControlChange(controller, editors));

      // 2] Note triggered CCs
      // for every editor which is note triggered, on note-on/note-off messages
      // compute the CC value and send it to IAC Driver Buses
      // the position of the cursor is updated every tick (tempo synced duration / 127)
      // until the note-off event occurs, three behaviors are possible when the end of the curve is rech
      // a) no more events are sent
      // b) the cursor start again from the begining and goes forward
      // c) the cursor goes backward, then when it reaches the beginning, goes forward again, and so on
      NOTE_TRIGGERED_ENABLED &&
        editors.forEach(editor => {
          const { duration, loop } = editor;
          if (duration) {
            const playingNotes = Array(127).fill(null);
            const handleNoteOnNoteOff = ({ note, type }) => {
              if (type === 'noteon') {
                const callbackOnTick = setCallbackOnTick({ BPM: 60, duration, loop });
                const cancelCallbackOnTick = callbackOnTick(cursor =>
                  computeCCAndSendToIACDriverBuses(cursor, editor, IACDriverBuses),
                );
                playingNotes[note.number] = cancelCallbackOnTick;
              } else {
                playingNotes[note.number]();
                playingNotes[note.number] = null;
              }
            };
            controllers.forEach(controller => controller.addListener('noteon', 'all', handleNoteOnNoteOff));
            controllers.forEach(controller => controller.addListener('noteoff', 'all', handleNoteOnNoteOff));
          }
        });
    };

    main();
    store.subscribe(main);
  });

  return reduxStore => (store = reduxStore);
};

export { MIDIHandler };
