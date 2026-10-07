import React, { useEffect, useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { c, st } from './styles';

type Props = {
  visible: boolean;
  busy: boolean;
  onClose: () => void;
  onFinish: () => void;
  onDiscard: () => void;
};

export function StopDialog({ visible, busy, onClose, onFinish, onDiscard }: Props) {
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  useEffect(() => { if (!visible) setConfirmDiscard(false); }, [visible]);

  return <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
    <View style={st.modalShade}><View style={st.dialog}>
      <Pressable style={{ alignSelf: 'flex-end' }} onPress={onClose} accessibilityLabel="Close stop dialog"><Ionicons name="close" size={20} color={c.white}/></Pressable>
      <Text style={st.kicker}>END SESSION</Text>
      {confirmDiscard ? <>
        <Text style={st.dialogTitle}>DISCARD RUN?</Text>
        <Text style={st.dialogBody}>Your route will be deleted.</Text>
        <Pressable disabled={busy} style={[st.dialogPrimary, { backgroundColor: c.red }]} onPress={onDiscard} accessibilityRole="button"><Text style={st.dialogPrimaryText}>DISCARD ACTIVITY</Text><Ionicons name="trash-outline" size={20} color={c.bg}/></Pressable>
        <Pressable disabled={busy} style={st.dialogSecondary} onPress={() => setConfirmDiscard(false)} accessibilityRole="button"><Text style={st.dialogSecondaryText}>CANCEL</Text></Pressable>
      </> : <>
        <Text style={st.dialogTitle}>GOOD WORK.</Text>
        <Text style={st.dialogBody}>Finish and save this run, or keep moving.</Text>
        <Pressable disabled={busy} style={st.dialogPrimary} onPress={onFinish} accessibilityRole="button"><Text style={st.dialogPrimaryText}>FINISH & SAVE</Text><Ionicons name="checkmark" size={20} color={c.bg}/></Pressable>
        <Pressable style={st.dialogSecondary} onPress={onClose} accessibilityRole="button"><Text style={st.dialogSecondaryText}>KEEP RUNNING</Text></Pressable>
        <Pressable onPress={() => setConfirmDiscard(true)} accessibilityRole="button"><Text style={st.discard}>DISCARD ACTIVITY</Text></Pressable>
      </>}
    </View></View>
  </Modal>;
}
