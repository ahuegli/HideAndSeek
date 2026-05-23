import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Coordinate } from '@hideandseek/shared';

interface ZoneDrawerProps {
  visible: boolean;
  points: Coordinate[];
  onUndo: () => void;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ZoneDrawer({
  visible,
  points,
  onUndo,
  onConfirm,
  onCancel,
}: ZoneDrawerProps) {
  if (!visible) return null;

  return (
    <View style={styles.bar}>
      <Text style={styles.label}>
        Tap map to draw zone ({points.length} point{points.length !== 1 ? 's' : ''})
      </Text>
      <View style={styles.actions}>
        <TouchableOpacity style={styles.btnSecondary} onPress={onCancel}>
          <Text style={styles.btnSecondaryText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.btnSecondary}
          onPress={onUndo}
          disabled={points.length === 0}
        >
          <Text style={[styles.btnSecondaryText, points.length === 0 && styles.disabled]}>
            Undo
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.btnPrimary, points.length < 3 && styles.btnPrimaryDisabled]}
          onPress={onConfirm}
          disabled={points.length < 3}
        >
          <Text style={styles.btnPrimaryText}>Confirm</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    top: 60,
    left: 16,
    right: 16,
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 6,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: '#e74c3c',
    marginBottom: 10,
    textAlign: 'center',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
  },
  btnSecondary: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#dfe6e9',
  },
  btnSecondaryText: {
    fontSize: 14,
    color: '#2c3e50',
    fontWeight: '500',
  },
  disabled: {
    color: '#bdc3c7',
  },
  btnPrimary: {
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: '#e74c3c',
  },
  btnPrimaryDisabled: {
    backgroundColor: '#bdc3c7',
  },
  btnPrimaryText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
  },
});
