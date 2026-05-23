import React, { useState } from 'react';
import {
  Alert,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Keyboard,
  Platform,
} from 'react-native';
import { Question, QuestionType, POI_CATEGORIES } from '@hideandseek/shared';
import type { POI } from '@hideandseek/shared';

interface QuestionSheetProps {
  questions: Question[];
  visible: boolean;
  onClose: () => void;
  onAddQuestion: (text: string, answer: string) => void;
  onAddRadar: (radiusKm: number, hiderInside: boolean) => void;
  onAddDistrict: (district: string, sameDistrict: boolean) => void;
  onAddTentacle: (category: string, selectedPOI: POI) => void;
  onFetchTentaclePOIs: (categoryKey: string) => void;
  tentaclePOILoading: boolean;
  tentaclePOIs: POI[];
  onEditRadar: (id: string, radiusKm: number, hiderInside: boolean) => void;
  onLocateRadar: (id: string) => void;
  onDeleteQuestion: (id: string) => void;
}

export default function QuestionSheet({
  questions,
  visible,
  onClose,
  onAddQuestion,
  onAddRadar,
  onAddDistrict,
  onAddTentacle,
  onFetchTentaclePOIs,
  tentaclePOILoading,
  tentaclePOIs,
  onEditRadar,
  onLocateRadar,
  onDeleteQuestion,
}: QuestionSheetProps) {
  const [mode, setMode] = useState<QuestionType>('radar');
  const [text, setText] = useState('');
  const [answer, setAnswer] = useState('');
  const [radiusKm, setRadiusKm] = useState('');
  const [hiderInside, setHiderInside] = useState<boolean | null>(null);

  // District state
  const [districtName, setDistrictName] = useState('');
  const [sameDistrict, setSameDistrict] = useState<boolean | null>(null);

  // Tentacle state
  const [tentacleCategory, setTentacleCategory] = useState('');
  const [selectedPOI, setSelectedPOI] = useState<POI | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [poiDropdownOpen, setPoiDropdownOpen] = useState(false);

  // Editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editRadius, setEditRadius] = useState('');
  const [editHiderInside, setEditHiderInside] = useState<boolean | null>(null);

  if (!visible) return null;

  const handleSubmitFreeform = () => {
    if (!text.trim() || !answer.trim()) return;
    onAddQuestion(text.trim(), answer.trim());
    setText('');
    setAnswer('');
  };

  const handleSubmitRadar = () => {
    const km = parseFloat(radiusKm);
    if (isNaN(km) || km <= 0 || hiderInside === null) return;
    onAddRadar(km, hiderInside);
    setRadiusKm('');
    setHiderInside(null);
  };

  const canSubmitRadar = (() => {
    const km = parseFloat(radiusKm);
    return !isNaN(km) && km > 0 && hiderInside !== null;
  })();

  const startEdit = (q: Question) => {
    if (!q.radar) return;
    setEditingId(q.id);
    setEditRadius(String(q.radar.radiusKm));
    setEditHiderInside(q.radar.hiderInside);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditRadius('');
    setEditHiderInside(null);
    Keyboard.dismiss();
  };

  const saveEdit = () => {
    if (!editingId) return;
    const km = parseFloat(editRadius);
    if (isNaN(km) || km <= 0 || editHiderInside === null) return;
    onEditRadar(editingId, km, editHiderInside);
    cancelEdit();
  };

  const canSaveEdit = (() => {
    const km = parseFloat(editRadius);
    return !isNaN(km) && km > 0 && editHiderInside !== null;
  })();

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
          renderItem={({ item, index }) => {
            const isEditing = editingId === item.id;

            if (isEditing && item.radar) {
              return (
                <View style={styles.editContainer}>
                  <Text style={styles.questionNumber}>Q{questions.length - index}</Text>
                  <View style={styles.editContent}>
                    <TextInput
                      style={styles.editInput}
                      value={editRadius}
                      onChangeText={setEditRadius}
                      keyboardType="numeric"
                      placeholder="Radius km"
                      placeholderTextColor="#999"
                      returnKeyType="done"
                      onSubmitEditing={() => Keyboard.dismiss()}
                      autoFocus
                    />
                    <View style={styles.editAnswerRow}>
                      <TouchableOpacity
                        style={[styles.editToggle, editHiderInside === true && styles.editToggleYes]}
                        onPress={() => setEditHiderInside(true)}
                      >
                        <Text style={[styles.editToggleText, editHiderInside === true && styles.editToggleTextActive]}>Inside</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.editToggle, editHiderInside === false && styles.editToggleNo]}
                        onPress={() => setEditHiderInside(false)}
                      >
                        <Text style={[styles.editToggleText, editHiderInside === false && styles.editToggleTextActive]}>Outside</Text>
                      </TouchableOpacity>
                    </View>
                    <View style={styles.editActions}>
                      <TouchableOpacity style={styles.editCancelBtn} onPress={cancelEdit}>
                        <Text style={styles.editCancelText}>Cancel</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.editSaveBtn, !canSaveEdit && styles.addBtnDisabled]}
                        onPress={saveEdit}
                        disabled={!canSaveEdit}
                      >
                        <Text style={styles.editSaveText}>Save</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              );
            }

            return (
              <View style={styles.questionItem}>
                <Text style={styles.questionNumber}>
                  Q{questions.length - index}
                </Text>
                <View style={styles.questionContent}>
                  {item.type === 'radar' && item.radar ? (
                    <>
                      <Text style={styles.questionText}>
                        📡 Radar: {item.radar.radiusKm} km
                      </Text>
                      <Text style={[styles.answerText, { color: item.radar.hiderInside ? '#27ae60' : '#e74c3c' }]}>
                        → Hider is {item.radar.hiderInside ? 'inside' : 'outside'}
                      </Text>
                    </>
                  ) : item.type === 'district' && item.district ? (
                    <>
                      <Text style={styles.questionText}>
                        🏛 Same district: {item.district.district}
                      </Text>
                      <Text style={[styles.answerText, { color: item.district.sameDistrict ? '#27ae60' : '#e74c3c' }]}>
                        → {item.district.sameDistrict ? 'Yes' : 'No'}
                      </Text>
                    </>
                  ) : item.type === 'tentacle' && item.tentacle ? (
                    <>
                      <Text style={styles.questionText}>
                        🐙 Nearest {item.tentacle.category}
                      </Text>
                      <Text style={styles.answerText}>
                        → {item.tentacle.answer}
                      </Text>
                    </>
                  ) : (
                    <>
                      <Text style={styles.questionText}>{item.text}</Text>
                      <Text style={styles.answerText}>→ {item.answer}</Text>
                    </>
                  )}
                  {item.zone && (
                    <Text style={styles.zoneLabel}>📍 Zone marked</Text>
                  )}
                </View>
                <View style={styles.radarActions}>
                  {item.type === 'radar' && item.radar && (
                    <>
                      <TouchableOpacity
                        style={styles.radarActionBtn}
                        onPress={() => onLocateRadar(item.id)}
                      >
                        <Text style={styles.radarActionIcon}>📍</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.radarActionBtn}
                        onPress={() => startEdit(item)}
                      >
                        <Text style={styles.radarActionIcon}>✎</Text>
                      </TouchableOpacity>
                    </>
                  )}
                  <TouchableOpacity
                    style={styles.radarActionBtn}
                    onPress={() => Alert.alert(
                      'Delete Question',
                      'Are you sure you want to delete this question?',
                      [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Delete', style: 'destructive', onPress: () => onDeleteQuestion(item.id) },
                      ]
                    )}
                  >
                    <Text style={styles.radarActionIcon}>🗑</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          }}
          ListEmptyComponent={
            <Text style={styles.empty}>No questions yet</Text>
          }
        />

        {/* Mode toggle */}
        <View style={styles.modeRow}>
          <TouchableOpacity
            style={[styles.modeBtn, mode === 'radar' && styles.modeBtnActive]}
            onPress={() => setMode('radar')}
          >
            <Text style={[styles.modeBtnText, mode === 'radar' && styles.modeBtnTextActive]}>📡</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeBtn, mode === 'district' && styles.modeBtnActive]}
            onPress={() => setMode('district')}
          >
            <Text style={[styles.modeBtnText, mode === 'district' && styles.modeBtnTextActive]}>🏛️</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeBtn, mode === 'tentacle' && styles.modeBtnActive]}
            onPress={() => setMode('tentacle')}
          >
            <Text style={[styles.modeBtnText, mode === 'tentacle' && styles.modeBtnTextActive]}>🐙</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeBtn, mode === 'freeform' && styles.modeBtnActive]}
            onPress={() => setMode('freeform')}
          >
            <Text style={[styles.modeBtnText, mode === 'freeform' && styles.modeBtnTextActive]}>✏️</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.modeLabel}>
          {mode === 'radar' ? 'Radar' : mode === 'district' ? 'District' : mode === 'tentacle' ? 'Tentacle' : 'Freeform'}
        </Text>

        {mode === 'radar' ? (
          <View style={styles.inputArea}>
            <TextInput
              style={styles.input}
              placeholder="Radius in km..."
              value={radiusKm}
              onChangeText={setRadiusKm}
              keyboardType="numeric"
              placeholderTextColor="#999"
              returnKeyType="done"
              onSubmitEditing={() => Keyboard.dismiss()}
            />
            <Text style={styles.answerLabel}>Is the hider within this radius?</Text>
            <View style={styles.answerRow}>
              <TouchableOpacity
                style={[styles.answerBtn, hiderInside === true && styles.answerBtnYes]}
                onPress={() => setHiderInside(true)}
              >
                <Text style={[styles.answerBtnText, hiderInside === true && styles.answerBtnTextActive]}>
                  ✓ Yes, inside
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.answerBtn, hiderInside === false && styles.answerBtnNo]}
                onPress={() => setHiderInside(false)}
              >
                <Text style={[styles.answerBtnText, hiderInside === false && styles.answerBtnTextActive]}>
                  ✗ No, outside
                </Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={[styles.addBtn, !canSubmitRadar && styles.addBtnDisabled]}
              onPress={() => { Keyboard.dismiss(); handleSubmitRadar(); }}
              disabled={!canSubmitRadar}
            >
              <Text style={styles.addBtnText}>Add Radar (uses your location)</Text>
            </TouchableOpacity>
          </View>
        ) : mode === 'district' ? (
          <View style={styles.inputArea}>
            <TextInput
              style={styles.input}
              placeholder="District name..."
              value={districtName}
              onChangeText={setDistrictName}
              placeholderTextColor="#999"
              returnKeyType="done"
              onSubmitEditing={() => Keyboard.dismiss()}
            />
            <Text style={styles.answerLabel}>Is the hider in this district?</Text>
            <View style={styles.answerRow}>
              <TouchableOpacity
                style={[styles.answerBtn, sameDistrict === true && styles.answerBtnYes]}
                onPress={() => setSameDistrict(true)}
              >
                <Text style={[styles.answerBtnText, sameDistrict === true && styles.answerBtnTextActive]}>
                  ✓ Yes
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.answerBtn, sameDistrict === false && styles.answerBtnNo]}
                onPress={() => setSameDistrict(false)}
              >
                <Text style={[styles.answerBtnText, sameDistrict === false && styles.answerBtnTextActive]}>
                  ✗ No
                </Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={[styles.addBtn, (!districtName.trim() || sameDistrict === null) && styles.addBtnDisabled]}
              onPress={() => {
                Keyboard.dismiss();
                onAddDistrict(districtName.trim(), sameDistrict!);
                setDistrictName('');
                setSameDistrict(null);
              }}
              disabled={!districtName.trim() || sameDistrict === null}
            >
              <Text style={styles.addBtnText}>Add District Question</Text>
            </TouchableOpacity>
          </View>
        ) : mode === 'tentacle' ? (
          <View style={styles.inputArea}>
            <Text style={styles.answerLabel}>POI category:</Text>
            <TouchableOpacity
              style={styles.dropdownToggle}
              onPress={() => { setDropdownOpen(!dropdownOpen); setPoiDropdownOpen(false); }}
            >
              <Text style={styles.dropdownToggleText}>
                {tentacleCategory
                  ? `${POI_CATEGORIES.find((c) => c.key === tentacleCategory)?.emoji} ${POI_CATEGORIES.find((c) => c.key === tentacleCategory)?.label}`
                  : 'Select a category...'}
              </Text>
              <Text style={styles.dropdownArrow}>{dropdownOpen ? '▲' : '▼'}</Text>
            </TouchableOpacity>
            {dropdownOpen && (
              <ScrollView style={styles.dropdownList} nestedScrollEnabled>
                {POI_CATEGORIES.map((cat) => (
                  <TouchableOpacity
                    key={cat.key}
                    style={[styles.dropdownItem, tentacleCategory === cat.key && styles.dropdownItemActive]}
                    onPress={() => {
                      setTentacleCategory(cat.key);
                      setSelectedPOI(null);
                      setDropdownOpen(false);
                      onFetchTentaclePOIs(cat.key);
                    }}
                  >
                    <Text style={[styles.dropdownItemText, tentacleCategory === cat.key && styles.dropdownItemTextActive]}>
                      {cat.emoji} {cat.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            {tentacleCategory ? (
              <>
                <Text style={[styles.answerLabel, { marginTop: 6 }]}>Nearest POI:</Text>
                {tentaclePOILoading ? (
                  <Text style={styles.poiFeedback}>Loading nearby POIs...</Text>
                ) : tentaclePOIs.length === 0 ? (
                  <Text style={styles.poiFeedback}>No POIs found within 15 km</Text>
                ) : (
                  <>
                    <TouchableOpacity
                      style={styles.dropdownToggle}
                      onPress={() => { setPoiDropdownOpen(!poiDropdownOpen); setDropdownOpen(false); }}
                    >
                      <Text style={styles.dropdownToggleText}>
                        {selectedPOI ? selectedPOI.name : `Select from ${tentaclePOIs.length} POIs...`}
                      </Text>
                      <Text style={styles.dropdownArrow}>{poiDropdownOpen ? '▲' : '▼'}</Text>
                    </TouchableOpacity>
                    {poiDropdownOpen && (
                      <ScrollView style={styles.dropdownList} nestedScrollEnabled>
                        {tentaclePOIs.map((poi) => (
                          <TouchableOpacity
                            key={poi.id}
                            style={[styles.dropdownItem, selectedPOI?.id === poi.id && styles.dropdownItemActive]}
                            onPress={() => {
                              setSelectedPOI(poi);
                              setPoiDropdownOpen(false);
                            }}
                          >
                            <Text style={[styles.dropdownItemText, selectedPOI?.id === poi.id && styles.dropdownItemTextActive]}>
                              {poi.name}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    )}
                  </>
                )}
              </>
            ) : null}

            <TouchableOpacity
              style={[styles.addBtn, (!tentacleCategory || !selectedPOI) && styles.addBtnDisabled]}
              onPress={() => {
                if (!selectedPOI) return;
                onAddTentacle(tentacleCategory, selectedPOI);
                setTentacleCategory('');
                setSelectedPOI(null);
              }}
              disabled={!tentacleCategory || !selectedPOI}
            >
              <Text style={styles.addBtnText}>Add Tentacle Question</Text>
            </TouchableOpacity>
          </View>
        ) : (
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
              onPress={handleSubmitFreeform}
              disabled={!text.trim() || !answer.trim()}
            >
              <Text style={styles.addBtnText}>Add Question → Draw Zone</Text>
            </TouchableOpacity>
          </View>
        )}
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
  radarActions: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginLeft: 6,
  },
  radarActionBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radarActionIcon: {
    fontSize: 14,
  },
  editContainer: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#ecf0f1',
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 8,
    marginVertical: 2,
  },
  editContent: {
    flex: 1,
    gap: 6,
  },
  editInput: {
    borderWidth: 1,
    borderColor: '#3498db',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 14,
    color: '#2c3e50',
    backgroundColor: '#fff',
  },
  editAnswerRow: {
    flexDirection: 'row',
    gap: 6,
  },
  editToggle: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#dfe6e9',
    alignItems: 'center',
  },
  editToggleYes: {
    backgroundColor: '#27ae60',
    borderColor: '#27ae60',
  },
  editToggleNo: {
    backgroundColor: '#e74c3c',
    borderColor: '#e74c3c',
  },
  editToggleText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#2c3e50',
  },
  editToggleTextActive: {
    color: '#fff',
  },
  editActions: {
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'flex-end',
  },
  editCancelBtn: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#bdc3c7',
  },
  editCancelText: {
    fontSize: 13,
    color: '#7f8c8d',
    fontWeight: '500',
  },
  editSaveBtn: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 6,
    backgroundColor: '#3498db',
  },
  editSaveText: {
    fontSize: 13,
    color: '#fff',
    fontWeight: '600',
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
  modeRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
    marginBottom: 4,
  },
  modeBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#dfe6e9',
    alignItems: 'center',
  },
  modeBtnActive: {
    backgroundColor: '#2c3e50',
    borderColor: '#2c3e50',
  },
  modeBtnText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#2c3e50',
  },
  modeBtnTextActive: {
    color: '#fff',
  },
  modeLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#7f8c8d',
    textAlign: 'center',
    marginBottom: 2,
  },
  dropdownToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#dfe6e9',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#f8f9fa',
    marginBottom: 4,
  },
  dropdownToggleText: {
    fontSize: 14,
    color: '#2c3e50',
    fontWeight: '500',
  },
  dropdownArrow: {
    fontSize: 12,
    color: '#7f8c8d',
  },
  dropdownList: {
    maxHeight: 180,
    borderWidth: 1,
    borderColor: '#dfe6e9',
    borderRadius: 8,
    backgroundColor: '#fff',
    marginBottom: 4,
  },
  dropdownItem: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#ecf0f1',
  },
  dropdownItemActive: {
    backgroundColor: '#eaf2f8',
  },
  dropdownItemText: {
    fontSize: 14,
    color: '#2c3e50',
  },
  dropdownItemTextActive: {
    fontWeight: '600',
    color: '#2c3e50',
  },
  poiFeedback: {
    fontSize: 12,
    color: '#7f8c8d',
    fontStyle: 'italic',
    marginBottom: 2,
  },
  answerLabel: {
    fontSize: 14,
    color: '#7f8c8d',
    marginTop: 2,
  },
  answerRow: {
    flexDirection: 'row',
    gap: 8,
  },
  answerBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#dfe6e9',
    alignItems: 'center',
  },
  answerBtnYes: {
    backgroundColor: '#27ae60',
    borderColor: '#27ae60',
  },
  answerBtnNo: {
    backgroundColor: '#e74c3c',
    borderColor: '#e74c3c',
  },
  answerBtnText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#2c3e50',
  },
  answerBtnTextActive: {
    color: '#fff',
  },
});
