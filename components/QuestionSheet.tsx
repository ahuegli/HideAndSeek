import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Question } from '../types/game';

interface QuestionSheetProps {
  questions: Question[];
  visible: boolean;
  onClose: () => void;
  onAddQuestion: (text: string, answer: string) => void;
}

export default function QuestionSheet({
  questions,
  visible,
  onClose,
  onAddQuestion,
}: QuestionSheetProps) {
  const [text, setText] = useState('');
  const [answer, setAnswer] = useState('');

  if (!visible) return null;

  const handleSubmit = () => {
    if (!text.trim() || !answer.trim()) return;
    onAddQuestion(text.trim(), answer.trim());
    setText('');
    setAnswer('');
  };

  return (
    <KeyboardAvoidingView
      style={styles.overlay}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.sheet}>
        <View style={styles.header}>
          <Text style={styles.title}>Questions ({questions.length})</Text>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.closeBtn}>✕</Text>
          </TouchableOpacity>
        </View>

        <FlatList
          data={[...questions].reverse()}
          keyExtractor={(item) => item.id}
          style={styles.list}
          renderItem={({ item, index }) => (
            <View style={styles.questionItem}>
              <Text style={styles.questionNumber}>
                Q{questions.length - index}
              </Text>
              <View style={styles.questionContent}>
                <Text style={styles.questionText}>{item.text}</Text>
                <Text style={styles.answerText}>→ {item.answer}</Text>
                {item.zone && (
                  <Text style={styles.zoneLabel}>📍 Zone marked</Text>
                )}
              </View>
            </View>
          )}
          ListEmptyComponent={
            <Text style={styles.empty}>No questions yet</Text>
          }
        />

        <View style={styles.inputArea}>
          <TextInput
            style={styles.input}
            placeholder="Question..."
            value={text}
            onChangeText={setText}
            placeholderTextColor="#999"
          />
          <TextInput
            style={styles.input}
            placeholder="Answer..."
            value={answer}
            onChangeText={setAnswer}
            placeholderTextColor="#999"
          />
          <TouchableOpacity
            style={[styles.addBtn, (!text.trim() || !answer.trim()) && styles.addBtnDisabled]}
            onPress={handleSubmit}
            disabled={!text.trim() || !answer.trim()}
          >
            <Text style={styles.addBtnText}>Add Question → Draw Zone</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    maxHeight: '70%',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2c3e50',
  },
  closeBtn: {
    fontSize: 22,
    color: '#7f8c8d',
    padding: 4,
  },
  list: {
    maxHeight: 200,
  },
  questionItem: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#ecf0f1',
  },
  questionNumber: {
    fontSize: 13,
    fontWeight: '700',
    color: '#e74c3c',
    width: 30,
    paddingTop: 2,
  },
  questionContent: {
    flex: 1,
  },
  questionText: {
    fontSize: 15,
    color: '#2c3e50',
  },
  answerText: {
    fontSize: 14,
    color: '#7f8c8d',
    marginTop: 2,
  },
  zoneLabel: {
    fontSize: 12,
    color: '#27ae60',
    marginTop: 2,
  },
  empty: {
    textAlign: 'center',
    color: '#bdc3c7',
    paddingVertical: 20,
    fontSize: 15,
  },
  inputArea: {
    marginTop: 10,
    gap: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#dfe6e9',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: '#2c3e50',
    backgroundColor: '#f8f9fa',
  },
  addBtn: {
    backgroundColor: '#e74c3c',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  addBtnDisabled: {
    backgroundColor: '#bdc3c7',
  },
  addBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
});
