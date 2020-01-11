import midi from 'webmidi';
import config from '../config/config.json';

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
  return controllers.map(controller => {
    const input = midi.getInputByName(controller);
    if (!input) {
      console.warn(
        `${controller} hasn't been found. Check if controller is properly connected or update config.json accordingly.`,
      );
    }
    return input;
  }).filter(controller => controller);
};

// This function accepts two parameters:
// length => in beat (eg. in a 4/4 signature, 4 gives a full-bar length, 1/4 a quarter, etc.)
// BPM => beats per minute ; set globally or per editor
const callbackOnTick = callback => {
  const length = 4;
  const BPM = 60;
  const beatValue = 60 / BPM * 1000;
  const bar = beatValue * length;
  const tick = bar / 127;

  let pos = 0;
  let i = 0;
  let currentBeat = 0;
  const timeLimitedCallback = () => {
    if (pos >= bar) {
      clearInterval(interval);
      return;
    }
    if (Math.abs(pos) >= currentBeat + beatValue) {
      currentBeat = currentBeat + beatValue;
    }
    pos += tick;
    i++;
    callback(i);
  };
  const interval = setInterval(timeLimitedCallback, tick);
  timeLimitedCallback();
  return () => console.log('detaching callback') || clearInterval(interval);
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

    // 1]
    // Simple forward from Divisimate to IAC Driver buses ; should I filter all but the notes?
    const proxyAllMIDIMessages = (inputs, outputs) => {
      const formatMIDIOutMessage = data => [data[0], [data[1], data[2]]];
      inputs.forEach((input, i) =>
        input.addListener('midimessage', undefined, ({ data }) =>
          outputs[i].send(...formatMIDIOutMessage(data)),
        ),
      );
    };
    proxyAllMIDIMessages(divisimatePorts, IACDriverBuses);

    // 2]
    // One Fader to rule them all, One Fader to find them,
    // One Fader to bring them all and in the music bind them
    // In the Land of MIDI where the CCs lie.
    const onControlChange = (controller, editors) => {
      controller.addListener('controlchange', 'all', ({ data }) => {
        const [, inputCC, inputValue] = data;
        if (controller.getCcNameByNumber(inputCC) === 'modulationwheelcoarse') {
          for (let i = 0; i < editors.length; i++) {
            const { CC, instrument, channels, MIDIValues } = editors[i];
            const outputValue = MIDIValues[inputValue];
            const output = IACDriverBuses[parseInt(instrument, 10) - 1];
            const outputCC = parseInt(CC, 10);
            output.sendControlChange(outputCC, outputValue, channels.split(','));
          }
        }
      });
    };

    const main = () => {
      const controllers = getControllers(config.controllers);
      if (!controllers.length) {
        throw new Error(
          'No input controller has been found. Please check if the one you want to use are properly set connected and listed in the config.json file.',
        );
      }

      // 1) fader based
      controllers.forEach(controller => controller.removeListener('controlchange', 'all'));
      controllers.forEach(controller => onControlChange(controller, store.getState().app.curveEditors));

      // 2) time based
      const playingNotes = Array(127).fill(null);
      const handleNoteOnNoteOff = ({ note, type }) => {
        if (type === 'noteon') {
          const cancelCallbackOnTick = callbackOnTick(i => {
            const { CC, instrument, channels, MIDIValues } = store.getState().app.curveEditors[0];
            const outputValue = MIDIValues[i];
            const output = IACDriverBuses[parseInt(instrument, 10) - 1];
            const outputCC = parseInt(CC, 10);
            output.sendControlChange(outputCC, outputValue, channels.split(','));
          });
          playingNotes[note.number] = cancelCallbackOnTick;
        } else {
          playingNotes[note.number]();
          playingNotes[note.number] = null;
        }
      };
      controllers[0].addListener('noteon', 'all', handleNoteOnNoteOff);
      controllers[0].addListener('noteoff', 'all', handleNoteOnNoteOff);
    };

    main();
    store.subscribe(main);
  });

  return reduxStore => (store = reduxStore);
};

export { MIDIHandler };
