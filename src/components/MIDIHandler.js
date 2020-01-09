import midi from 'webmidi';
import config from '../config/config.json';

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
      throw new Error(
        `${controller} hasn't been found. Check if controller is properly connected or update config.json accordingly.`,
      );
    }
    return input;
  });
};

const MIDIHandler = () => {
  let store = null;

  midi.enable(err => {
    if (err) {
      console.log('WebMidi could not be enabled.', err);
      return;
    }
    // midi.inputs.forEach(input => console.log(input.name)); // debug
    // midi.outputs.forEach(output => console.log(output.name)); // debug

    const divisimatePorts = getDivisimatePorts(32);
    const IACDriverBuses = getIACDriverBuses(32);
    const controllers = getControllers(config.controllers);

    // Simple forward from Divisimate to IAC Driver buses ; should I filter all but the notes?
    const formatMIDIOutMessage = data => [data[0], [data[1], data[2]]];
    const proxyAllMIDIMessages = (inputs, outputs) => {
      inputs.forEach((input, i) =>
        input.addListener('midimessage', undefined, ({ data }) =>
          // console.log(outputs[i]),
          outputs[i].send(...formatMIDIOutMessage(data)),
        ),
      );
    };
    proxyAllMIDIMessages(divisimatePorts, IACDriverBuses);

    // // One Fader to rule them all, One Fader to find them,
    // // One Fader to bring them all and in the music bind them
    // // In the Land of MIDI where the CCs lie.
    // store.subscribe(() => { // TODO: we should make the first call before a subscribe !
    //   MIDITouchbar.removeListener('controlchange', 'all');
    //   const editors = store.getState().app.curveEditors;
    //   console.log(editors);
    //   MIDITouchbar.addListener('controlchange', 'all', ({ data }) => {
    //     const [, inputCC, inputValue] = data;
    //     if (inputCC === 1) {
    //       for (let i = 0; i < editors.length; i++) {
    //         const editor = editors[i];
    //         const outputValue = editor.MIDIValues[inputValue];
    //         const output = outputs[parseInt(editor.instrument, 10) - 1];
    //         const outputCC = parseInt(editor.CC, 10);
    //         console.log(outputCC, outputValue);
    //         output.sendControlChange(outputCC, outputValue);
    //       }
    //     }
    //   });
    // });
  });

  return reduxStore => (store = reduxStore);
};

export { MIDIHandler };
