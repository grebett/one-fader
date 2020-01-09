import midi from 'webmidi';

const MIDIHandler = () => {
  let store = null;

  midi.enable(err => {
    if (err) {
      console.log('WebMidi could not be enabled.', err);
      return;
    }
    // midi.inputs.forEach(input => console.log(input.name)); // debug
    // midi.outputs.forEach(output => console.log(output.name)); // debug

    const Divisimate01 = midi.getInputByName('Divisimate Port 01');
    const Divisimate02 = midi.getInputByName('Divisimate Port 02');
    const Divisimate03 = midi.getInputByName('Divisimate Port 03');
    const Divisimate04 = midi.getInputByName('Divisimate Port 04');
    const MIDITouchbar = midi.getInputByName('MIDI Touchbar User');
    const IACDriverBus1 = midi.getOutputByName('IAC Driver Bus 1');
    const IACDriverBus2 = midi.getOutputByName('IAC Driver Bus 2');
    const IACDriverBus3 = midi.getOutputByName('IAC Driver Bus 3');
    const IACDriverBus4 = midi.getOutputByName('IAC Driver Bus 4');
    const outputs = [IACDriverBus1, IACDriverBus2, IACDriverBus3, IACDriverBus4];

    // Simple forward from Divisimate to IAC Driver buses ; should I filter all but the notes?
    Divisimate01.addListener('midimessage', undefined, ({ data }) => IACDriverBus1.send(data[0], [data[1], data[2]]));
    Divisimate02.addListener('midimessage', undefined, ({ data }) => IACDriverBus2.send(data[0], [data[1], data[2]]));
    Divisimate03.addListener('midimessage', undefined, ({ data }) => IACDriverBus3.send(data[0], [data[1], data[2]]));
    Divisimate04.addListener('midimessage', undefined, ({ data }) => IACDriverBus4.send(data[0], [data[1], data[2]]));

    // One Fader to rule them all, One Fader to find them,
    // One Fader to bring them all and in the music bind them
    // In the Land of MIDI where the CCs lie.
    store.subscribe(() => { // TODO: we should make the first call before a subscribe !
      MIDITouchbar.removeListener('controlchange', 'all');
      const editors = store.getState().app.curveEditors;
      console.log(editors);
      MIDITouchbar.addListener('controlchange', 'all', ({ data }) => {
        const [, inputCC, inputValue] = data;
        if (inputCC === 1) {
          for (let i = 0; i < editors.length; i++) {
            const editor = editors[i];
            const outputValue = editor.MIDIValues[inputValue];
            const output = outputs[parseInt(editor.instrument, 10) - 1];
            const outputCC = parseInt(editor.CC, 10);
            console.log(outputCC, outputValue);
            output.sendControlChange(outputCC, outputValue);
          }
        }
      });
    });
  });

  return reduxStore => (store = reduxStore);
};

export { MIDIHandler };
