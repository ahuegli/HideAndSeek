import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { searchPlaces, Region } from '@hideandseek/shared';
import type { PlaceResult } from '@hideandseek/shared';

interface PlaceSearchProps {
  visible: boolean;
  regions: Region[];
  onSelect: (place: PlaceResult) => void;
  onDeleteRegion: (regionId: string) => void;
  onClose: () => void;
}

export default function PlaceSearch({ visible, regions, onSelect, onDeleteRegion, onClose }: PlaceSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PlaceResult[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = useCallback(async () => {
    if (!query.trim()) return;
    setLoading(true);
    try {
      const places = await searchPlaces(query.trim());
      setResults(places);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [query]);

  if (!visible) return null;

  return (
    <View style={styles.overlay}>
      <View style={styles.sheet}>
        <View style={styles.header}>
          <Text style={styles.title}>Choose Playing Field</Text>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.closeBtn}>✕</Text>
          </TouchableOpacity>
        </View>

        {regions.length > 0 && (
          <View style={styles.currentSection}>
            <Text style={styles.currentLabel}>Current regions:</Text>
            {regions.map((region) => (
              <View key={region.id} style={styles.currentField}>
                <Text style={styles.currentName} numberOfLines={1}>
                  {region.name.split(',')[0]}
                </Text>
                <TouchableOpacity
                  style={styles.deleteBtn}
                  onPress={() => onDeleteRegion(region.id)}
                >
                  <Text style={styles.deleteBtnText}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        <View style={styles.searchRow}>
          <TextInput
            style={styles.input}
            placeholder="Search a country, city, region..."
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
            placeholderTextColor="#999"
            autoFocus
          />
          <TouchableOpacity style={styles.searchBtn} onPress={handleSearch}>
            <Text style={styles.searchBtnText}>Search</Text>
          </TouchableOpacity>
        </View>

        {loading && <ActivityIndicator style={styles.loader} color="#e74c3c" />}

        <FlatList
          data={results}
          keyExtractor={(item) => item.id.toString()}
          style={styles.list}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.resultItem}
              onPress={() => {
                onSelect(item);
                setQuery('');
                setResults([]);
              }}
            >
              <Text style={styles.resultName} numberOfLines={2}>
                {item.name}
              </Text>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            !loading && query.trim() ? (
              <Text style={styles.empty}>
                {results.length === 0 && query ? 'No results. Try a different search.' : ''}
              </Text>
            ) : null
          }
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-start',
    paddingTop: 80,
    paddingHorizontal: 16,
  },
  sheet: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    maxHeight: '70%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
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
  searchRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#dfe6e9',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: '#2c3e50',
    backgroundColor: '#f8f9fa',
  },
  searchBtn: {
    backgroundColor: '#e74c3c',
    borderRadius: 10,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  searchBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  loader: {
    marginVertical: 16,
  },
  list: {
    maxHeight: 300,
  },
  resultItem: {
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#ecf0f1',
  },
  resultName: {
    fontSize: 15,
    color: '#2c3e50',
  },
  currentSection: {
    marginBottom: 12,
  },
  currentField: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f8ff',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginTop: 6,
    borderWidth: 1,
    borderColor: '#d4e6f1',
  },
  currentInfo: {
    flex: 1,
  },
  currentLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#7f8c8d',
  },
  currentName: {
    flex: 1,
    fontSize: 14,
    color: '#2c3e50',
    fontWeight: '500',
  },
  deleteBtn: {
    backgroundColor: '#e74c3c',
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
  },
  deleteBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  empty: {
    textAlign: 'center',
    color: '#bdc3c7',
    paddingVertical: 20,
    fontSize: 14,
  },
});
