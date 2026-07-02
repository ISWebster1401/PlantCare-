import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  FlatList,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '../context/ThemeContext';
import { Typography, Spacing, BorderRadius } from '../constants/DesignSystem';

interface SpeciesSelectorProps {
  selectedSpecies: string | null;
  onSelect: (species: string | null) => void;
  suggestedSpecies?: string;
}

const AVAILABLE_SPECIES = [
  'Adiantum capillus-veneris',
  'Aglaonema commutatum',
  'Aloe barbadensis',
  'Aloe vera',
  'Anthurium andraeanum',
  'Aspidistra elatior',
  'Asplenium nidus',
  'Beaucarnea recurvata',
  'Begonia rex',
  'Calathea ornata',
  'Chlorophytum comosum',
  'Crassula ovata',
  'Dracaena marginata',
  'Echeveria elegans',
  'Epipremnum aureum',
  'Ficus elastica',
  'Ficus lyrata',
  'Hedera helix',
  'Maranta leuconeura',
  'Monstera deliciosa',
  'Nephrolepis exaltata',
  'Pachira aquatica',
  'Peperomia obtusifolia',
  'Philodendron scandens',
  'Pilea peperomioides',
  'Pothos',
  'Sansevieria trifasciata',
  'Schefflera arboricola',
  'Spathiphyllum wallisii',
  'Strelitzia reginae',
  'Zamioculcas zamiifolia',
];

export const SpeciesSelector: React.FC<SpeciesSelectorProps> = ({
  selectedSpecies,
  onSelect,
  suggestedSpecies,
}) => {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [modalVisible, setModalVisible] = useState(false);

  const species = useMemo(() => {
    if (!suggestedSpecies) return AVAILABLE_SPECIES;
    return [...AVAILABLE_SPECIES].sort((a, b) => {
      if (a.toLowerCase() === suggestedSpecies.toLowerCase()) return -1;
      if (b.toLowerCase() === suggestedSpecies.toLowerCase()) return 1;
      return a.localeCompare(b);
    });
  }, [suggestedSpecies]);

  const handleSelect = (item: string) => {
    onSelect(item);
    setModalVisible(false);
  };

  const handleClear = () => {
    onSelect(null);
  };

  return (
    <View>
      <TouchableOpacity
        style={styles.selectorButton}
        onPress={() => setModalVisible(true)}
      >
        <Ionicons
          name="leaf-outline"
          size={20}
          color={selectedSpecies ? colors.primary : colors.textMuted}
        />
        <Text
          style={[
            styles.selectorText,
            { color: selectedSpecies ? colors.text : colors.textMuted },
          ]}
          numberOfLines={1}
        >
          {selectedSpecies || 'Seleccionar especie'}
        </Text>

        {selectedSpecies ? (
          <TouchableOpacity
            onPress={handleClear}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="close-circle" size={22} color={colors.textMuted} />
          </TouchableOpacity>
        ) : (
          <Ionicons name="chevron-down" size={20} color={colors.textMuted} />
        )}
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setModalVisible(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Seleccionar especie</Text>
            <TouchableOpacity
              onPress={() => setModalVisible(false)}
              style={styles.closeModalButton}
            >
              <Ionicons name="close" size={28} color={colors.text} />
            </TouchableOpacity>
          </View>

          <FlatList
            data={species}
            keyExtractor={(item) => item}
            renderItem={({ item }) => {
              const isSelected = selectedSpecies === item;
              const isSuggested =
                suggestedSpecies?.toLowerCase() === item.toLowerCase();

              return (
                <TouchableOpacity
                  style={[
                    styles.speciesItem,
                    isSelected && styles.speciesItemSelected,
                  ]}
                  onPress={() => handleSelect(item)}
                >
                  <Ionicons
                    name="leaf-outline"
                    size={20}
                    color={isSelected ? colors.primary : colors.textMuted}
                  />
                  <View style={styles.speciesInfo}>
                    <Text
                      style={[
                        styles.speciesName,
                        { color: isSelected ? colors.primary : colors.text },
                      ]}
                    >
                      {item}
                    </Text>
                    {isSuggested && (
                      <View style={styles.suggestedBadge}>
                        <Ionicons name="sparkles" size={12} color={colors.primary} />
                        <Text style={styles.suggestedText}>Sugerida</Text>
                      </View>
                    )}
                  </View>
                  {isSelected && (
                    <Ionicons
                      name="checkmark-circle"
                      size={24}
                      color={colors.primary}
                    />
                  )}
                </TouchableOpacity>
              );
            }}
            contentContainerStyle={styles.listContent}
          />

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={styles.continueButton}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.continueButtonText}>
                {selectedSpecies ? 'Confirmar' : 'Saltar'}
              </Text>
              <Ionicons name="arrow-forward" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    </View>
  );
};

function createStyles(colors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
    selectorButton: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: Spacing.md,
      borderRadius: BorderRadius.md,
      borderWidth: 1,
      borderColor: colors.backgroundLighter,
      backgroundColor: colors.backgroundLighter,
      gap: 12,
    },
    selectorText: {
      flex: 1,
      fontSize: Typography.sizes.base,
    },
    modalContainer: {
      flex: 1,
      backgroundColor: colors.background,
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: Spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: colors.backgroundLighter,
    },
    modalTitle: {
      fontSize: Typography.sizes.xl,
      fontWeight: Typography.weights.bold,
      color: colors.text,
    },
    closeModalButton: {
      padding: 4,
    },
    listContent: {
      paddingBottom: 20,
    },
    speciesItem: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: Spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: colors.backgroundLighter,
      gap: 12,
    },
    speciesItemSelected: {
      backgroundColor: colors.primary + '15',
    },
    speciesInfo: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
    },
    speciesName: {
      fontSize: Typography.sizes.base,
    },
    suggestedBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: Spacing.sm,
      paddingVertical: 2,
      borderRadius: BorderRadius.sm,
      backgroundColor: colors.primary + '20',
      gap: 4,
    },
    suggestedText: {
      fontSize: Typography.sizes.xs,
      fontWeight: Typography.weights.semibold,
      color: colors.primary,
    },
    modalFooter: {
      padding: Spacing.md,
      borderTopWidth: 1,
      borderTopColor: colors.backgroundLighter,
    },
    continueButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      padding: Spacing.md,
      borderRadius: BorderRadius.md,
      backgroundColor: colors.primary,
      gap: Spacing.sm,
    },
    continueButtonText: {
      color: '#fff',
      fontSize: Typography.sizes.base,
      fontWeight: Typography.weights.bold,
    },
  });
}

export default SpeciesSelector;
