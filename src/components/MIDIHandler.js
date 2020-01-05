import { useDispatch } from 'react-redux';

const MIDIHandler = () => {
  const dispatch = useDispatch();
  const onMIDIMessage = ({ data, ...rest }) => {
    const [command, value, velocity] = data;
    dispatch({ type: 'INCOMING_MIDI_DATA', payload: { command, value, velocity } });
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
