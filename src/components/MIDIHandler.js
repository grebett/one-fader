

const MIDIHandler = () => {
  let store = null;

  const onMIDIMessage = ({port, from, outputs}) => ({ data }) => {
    // 0) We need a bound react Redux store to start dispatching modified MIDI events
    if (!store) {
      return;
    }
    // 1) Parse Incoming MIDI data
    const [command, value, velocity] = data;
    const IACInstrument = n => `IAC Driver Bus ${n}`;

    // 2) FORWARD EVERYTHING FROM DIVISIMATE TO AGREGATE VIRTUAL DEVICE
    if (from === 'Divisimate') {
      console.log('1️⃣from', from, 'port', port)
      console.log('2️⃣command', command, 'value', value, 'velocity', velocity);
      for (let output = outputs.next(); output && !output.done; output = outputs.next()) {
        if (output.value.name === IACInstrument(port)) {
          console.log(IACInstrument(port));
          // output.value.send([command, value, velocity]);
          console.log(output.value);
          output.value.send([0x90, 0x3b, 0x5e], window.performance.now() + 1000.0);
        }
      }
    } else {
      // // 3) COMPUTE NEW MIDI VALUE FROM EDITOR AND SEND TO AGREGATE VIRTUAL DEVICE
      // const editors = store.getState().app.curveEditors;
      // editors.forEach(editor => {
      //   if (editor.MIDIValues.length > 0) {
      //     const value = editor.MIDIValues[velocity];
      //     const channel = editor.channel;
      //     const CC = editor.CC;
      //     const boundaries = [editor.boundMin, editor.boundMax];
      //     console.log('4️⃣new value', value, 'channel', channel, 'CC', CC, 'boundaries', boundaries);
      //   }
      // });
    }
  };

  (async () => {
    if (navigator.requestMIDIAccess) {
      const midi = await navigator.requestMIDIAccess();
      const inputs = midi.inputs.values();
      const outputs = midi.outputs.values();
      // loop over all available inputs and listen for any MIDI input
      for (let input = inputs.next(); input && !input.done; input = inputs.next()) {
        if (input.value.name.indexOf('Divisimate') !== -1) {
          const port = input.value.name.match(/Divisimate Port (\d+)/)[1];
          input.value.onmidimessage = null;
          input.value.onmidimessage = onMIDIMessage({ from: 'Divisimate', port: parseInt(port, 10), outputs });
        } else {
          input.value.onmidimessage = null;
          input.value.onmidimessage = onMIDIMessage({ from: input.value.name, outputs });
        }
      }
    } else {
      throw new Error('MIDI is not supported on your device!');
    }
  })();

  return reduxStore => store = reduxStore;
};

export { MIDIHandler };
