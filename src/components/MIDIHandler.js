import { useSelector } from 'react-redux';

const MIDIHandler = () => {
  const editors = useSelector(state => state.app.curveEditors);
  const onMIDIMessage = ({ data, ...rest }) => {
    const [, , velocity] = data;
    editors.forEach(editor => {
      if (editor.MIDIValues.length > 0) {
        console.log('🎻', editor.id, '===>', editor.MIDIValues[velocity]);
      }
    })
  };

  (async () => {
    if (navigator.requestMIDIAccess) {
      const midi = await navigator.requestMIDIAccess();
      const inputs = midi.inputs.values();
      // loop over all available inputs and listen for any MIDI input
      for (let input = inputs.next(); input && !input.done; input = inputs.next()) {
        if (input.value.name.indexOf('Touchbar') !== -1) {
          input.value.onmidimessage = onMIDIMessage;
        }
      }
      console.log(midi);
    } else {
      throw new Error('MIDI is not supported on your device!');
    }
  })();

  return null;
};

export { MIDIHandler };
