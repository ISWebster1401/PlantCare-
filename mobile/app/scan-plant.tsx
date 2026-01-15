/**
 * Pantalla de Scanner de Plantas - Rediseñada con DesignSystem
 * Multi-step flow: nombre -> foto -> identificación -> creación
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Alert,
  ActivityIndicator,
  ScrollView,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { plantsAPI } from '../services/api';
import { PlantIdentify } from '../types';
import { PlantSpeciesAutocomplete } from '../components/PlantSpeciesAutocomplete';
import { Button, Card, Badge } from '../components/ui';
import { Colors, Typography, Spacing, BorderRadius, Gradients, Shadows } from '../constants/DesignSystem';

type Step = 'name' | 'photo' | 'identifying' | 'results' | 'creating';

export default function ScanPlantScreen() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('name');
  const [plantName, setPlantName] = useState('');
  const [plantSpecies, setPlantSpecies] = useState('');
  const [photo, setPhoto] = useState<{ uri: string; type: string; name: string } | null>(null);
  const [identification, setIdentification] = useState<PlantIdentify | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const requestCameraPermission = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permisos requeridos', 'Necesitamos acceso a tu cámara para escanear plantas');
      return false;
    }
    return true;
  };

  const requestMediaLibraryPermission = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permisos requeridos', 'Necesitamos acceso a tu galería para seleccionar imágenes');
      return false;
    }
    return true;
  };

  const takePhoto = async () => {
    const hasPermission = await requestCameraPermission();
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        setPhoto({
          uri: asset.uri,
          type: 'image/jpeg',
          name: `plant_${Date.now()}.jpg`,
        });
        setStep('identifying');
        identifyPlant(asset.uri);
      }
    } catch (error) {
      console.error('Error tomando foto:', error);
      Alert.alert('Error', 'No se pudo tomar la foto');
    }
  };

  const pickFromGallery = async () => {
    const hasPermission = await requestMediaLibraryPermission();
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        let imageType = 'image/jpeg';
        let extension = 'jpg';
        const uriLower = asset.uri.toLowerCase();
        if (uriLower.includes('.png')) {
          imageType = 'image/png';
          extension = 'png';
        } else if (uriLower.includes('.heic') || uriLower.includes('.heif')) {
          imageType = 'image/jpeg';
          extension = 'jpg';
        }
        
        setPhoto({
          uri: asset.uri,
          type: imageType,
          name: asset.uri.split('/').pop() || `plant_${Date.now()}.${extension}`,
        });
        setStep('identifying');
        identifyPlant(asset.uri);
      }
    } catch (error) {
      console.error('Error seleccionando imagen:', error);
      Alert.alert('Error', 'No se pudo seleccionar la imagen');
    }
  };

  const identifyPlant = async (imageUri: string) => {
    setIsLoading(true);
    try {
      const file = {
        uri: imageUri,
        type: photo?.type || 'image/jpeg',
        name: photo?.name || `plant_${Date.now()}.${photo?.type?.includes('png') ? 'png' : 'jpg'}`,
      };

      const result = await plantsAPI.identifyPlant(file, plantSpecies.trim() || undefined);
      setIdentification(result);
      setStep('results');
    } catch (error: any) {
      console.error('Error identificando planta:', error);
      Alert.alert(
        'Error de identificación',
        error.response?.data?.detail || 'No se pudo identificar la planta. Intenta con otra foto.'
      );
      setStep('photo');
    } finally {
      setIsLoading(false);
    }
  };

  const createPlant = async () => {
    if (!photo || !plantName.trim()) {
      Alert.alert('Error', 'Faltan datos para crear la planta');
      return;
    }

    setStep('creating');
    setIsLoading(true);

    try {
      await plantsAPI.createPlant(photo, plantName.trim(), plantSpecies.trim() || undefined);
      Alert.alert('¡Éxito!', 'Tu planta ha sido agregada a tu jardín', [
        {
          text: 'OK',
          onPress: () => router.replace('/(tabs)/garden'),
        },
      ]);
    } catch (error: any) {
      console.error('Error creando planta:', error);
      Alert.alert('Error', error.response?.data?.detail || 'No se pudo crear la planta');
      setStep('results');
    } finally {
      setIsLoading(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 'name':
        return (
          <ScrollView style={styles.stepContainer} contentContainerStyle={styles.stepContent}>
            <View style={styles.iconContainer}>
              <View style={styles.iconCircle}>
                <Text style={styles.iconEmoji}>🌱</Text>
              </View>
            </View>
            <Text style={styles.stepTitle}>¿Cómo se llama tu planta?</Text>
            <Text style={styles.stepDescription}>
              Dale un nombre especial. Si conoces la especie, ingrésala para mejorar la identificación.
            </Text>
            
            <View style={styles.inputContainer}>
              <Ionicons name="leaf-outline" size={20} color={Colors.textSecondary} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Nombre de la planta (ej: Pepito, Rosita...)"
                placeholderTextColor={Colors.textMuted}
                value={plantName}
                onChangeText={setPlantName}
                autoFocus
              />
            </View>

            <PlantSpeciesAutocomplete
              value={plantSpecies}
              onChange={setPlantSpecies}
              placeholder="Especie (opcional, ej: Monstera deliciosa...)"
            />

            <Text style={styles.hintText}>
              💡 Si conoces la especie, ingrésala para una identificación más precisa
            </Text>

            <Button
              title="Continuar"
              onPress={() => setStep('photo')}
              variant="primary"
              size="lg"
              disabled={!plantName.trim()}
              icon="arrow-forward"
              iconPosition="right"
              fullWidth
              style={styles.continueButton}
            />
          </ScrollView>
        );

      case 'photo':
        return (
          <ScrollView style={styles.stepContainer} contentContainerStyle={styles.stepContent}>
            <View style={styles.iconContainer}>
              <View style={styles.iconCircle}>
                <Text style={styles.iconEmoji}>📷</Text>
              </View>
            </View>
            <Text style={styles.stepTitle}>Toma o selecciona una foto</Text>
            <Text style={styles.stepDescription}>
              Nuestra IA identificará automáticamente tu planta
            </Text>

            <View style={styles.photoOptions}>
              <Card
                variant="elevated"
                onPress={takePhoto}
                style={styles.photoCard}
              >
                <View style={styles.photoCardContent}>
                  <View style={styles.photoIconContainer}>
                    <Ionicons name="camera" size={40} color={Colors.primary} />
                  </View>
                  <Text style={styles.photoCardText}>Tomar Foto</Text>
                </View>
              </Card>

              <Card
                variant="elevated"
                onPress={pickFromGallery}
                style={styles.photoCard}
              >
                <View style={styles.photoCardContent}>
                  <View style={styles.photoIconContainer}>
                    <Ionicons name="images" size={40} color={Colors.primary} />
                  </View>
                  <Text style={styles.photoCardText}>Desde Galería</Text>
                </View>
              </Card>
            </View>

            <Button
              title="Volver"
              onPress={() => setStep('name')}
              variant="ghost"
              size="md"
              icon="arrow-back"
              iconPosition="left"
              fullWidth
            />
          </ScrollView>
        );

      case 'identifying':
        return (
          <View style={styles.stepContainer}>
            <View style={styles.loadingContainer}>
              <View style={styles.loadingIconContainer}>
                <Text style={styles.loadingEmoji}>🔍</Text>
              </View>
              <ActivityIndicator size="large" color={Colors.primary} style={styles.loader} />
              <Text style={styles.loadingText}>Identificando tu planta...</Text>
              <Text style={styles.loadingSubtext}>Esto puede tomar unos segundos</Text>
            </View>
          </View>
        );

      case 'results':
        if (!identification) return null;

        return (
          <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.resultsContent}>
            {photo && (
              <Card variant="elevated" style={styles.imageCard}>
                <Image source={{ uri: photo.uri }} style={styles.previewImage} resizeMode="cover" />
              </Card>
            )}

            <Card variant="elevated" style={styles.resultCard}>
              <View style={styles.resultHeader}>
                <Ionicons name="checkmark-circle" size={32} color={Colors.primary} />
                <View style={styles.resultTitleContainer}>
                  <Text style={styles.resultTitle}>{identification.plant_type}</Text>
                  {identification.scientific_name && (
                    <Text style={styles.resultSubtitle}>{identification.scientific_name}</Text>
                  )}
                </View>
              </View>
              <Badge
                status={identification.care_level === 'Fácil' ? 'healthy' : identification.care_level === 'Medio' ? 'warning' : 'critical'}
                label={`Nivel: ${identification.care_level}`}
                size="sm"
              />
            </Card>

            <Card variant="elevated" style={styles.resultCard}>
              <View style={styles.resultCardHeader}>
                <Ionicons name="bulb" size={24} color={Colors.accent} />
                <Text style={styles.resultCardTitle}>Consejos de cuidado</Text>
              </View>
              <Text style={styles.resultText}>{identification.care_tips}</Text>
            </Card>

            <Card variant="elevated" style={styles.resultCard}>
              <View style={styles.resultCardHeader}>
                <Ionicons name="stats-chart" size={24} color={Colors.secondary} />
                <Text style={styles.resultCardTitle}>Condiciones óptimas</Text>
              </View>
              <View style={styles.conditionsRow}>
                <View style={styles.conditionItem}>
                  <Ionicons name="water" size={20} color={Colors.secondary} />
                  <Text style={styles.conditionText}>
                    {identification.optimal_humidity_min}% - {identification.optimal_humidity_max}%
                  </Text>
                </View>
                <View style={styles.conditionItem}>
                  <Ionicons name="thermometer" size={20} color={Colors.error} />
                  <Text style={styles.conditionText}>
                    {identification.optimal_temp_min}°C - {identification.optimal_temp_max}°C
                  </Text>
                </View>
              </View>
            </Card>

            <Button
              title="Agregar a Mi Jardín"
              onPress={createPlant}
              variant="primary"
              size="lg"
              icon="add-circle"
              iconPosition="left"
              fullWidth
              style={styles.addButton}
            />

            <Button
              title="Tomar otra foto"
              onPress={() => {
                setStep('photo');
                setPhoto(null);
                setIdentification(null);
              }}
              variant="ghost"
              size="md"
              icon="camera-outline"
              iconPosition="left"
              fullWidth
            />
          </ScrollView>
        );

      case 'creating':
        return (
          <View style={styles.stepContainer}>
            <View style={styles.loadingContainer}>
              <View style={styles.loadingIconContainer}>
                <Text style={styles.loadingEmoji}>✨</Text>
              </View>
              <ActivityIndicator size="large" color={Colors.primary} style={styles.loader} />
              <Text style={styles.loadingText}>Creando tu planta...</Text>
              <Text style={styles.loadingSubtext}>
                Generando el personaje único de <Text style={{ fontWeight: Typography.weights.bold }}>{plantName}</Text>
              </Text>
            </View>
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={Gradients.primary}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <Button
          title=""
          onPress={() => router.back()}
          variant="ghost"
          size="sm"
          icon="close"
          style={styles.closeButton}
        />
        <Text style={styles.headerTitle}>Escanear Planta</Text>
        <View style={styles.closeButtonPlaceholder} />
      </LinearGradient>

      {renderStep()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.lg,
    paddingTop: 60,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  headerTitle: {
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.bold,
    color: Colors.white,
  },
  closeButton: {
    width: 40,
    height: 40,
    padding: 0,
  },
  closeButtonPlaceholder: {
    width: 40,
  },
  stepContainer: {
    flex: 1,
  },
  stepContent: {
    padding: Spacing.lg,
    paddingTop: Spacing.xl,
    flexGrow: 1,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: `${Colors.primary}20`,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: Colors.primary,
  },
  iconEmoji: {
    fontSize: 64,
  },
  stepTitle: {
    fontSize: Typography.sizes.xxl,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  stepDescription: {
    fontSize: Typography.sizes.base,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.xl,
    lineHeight: 22,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.backgroundLighter,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.backgroundLighter,
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.md,
  },
  inputIcon: {
    marginRight: Spacing.sm,
  },
  input: {
    flex: 1,
    height: 48,
    fontSize: Typography.sizes.base,
    color: Colors.text,
    paddingVertical: 0,
  },
  hintText: {
    fontSize: Typography.sizes.sm,
    color: Colors.textMuted,
    textAlign: 'center',
    marginBottom: Spacing.lg,
    paddingHorizontal: Spacing.md,
    lineHeight: 18,
  },
  continueButton: {
    marginTop: Spacing.md,
  },
  photoOptions: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  photoCard: {
    flex: 1,
  },
  photoCardContent: {
    alignItems: 'center',
    padding: Spacing.lg,
  },
  photoIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: `${Colors.primary}15`,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  photoCardText: {
    color: Colors.text,
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.semibold,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  loadingIconContainer: {
    marginBottom: Spacing.xl,
  },
  loadingEmoji: {
    fontSize: 80,
  },
  loader: {
    marginVertical: Spacing.lg,
  },
  loadingText: {
    color: Colors.text,
    fontSize: Typography.sizes.xl,
    textAlign: 'center',
    marginTop: Spacing.md,
    fontWeight: Typography.weights.semibold,
  },
  loadingSubtext: {
    color: Colors.textSecondary,
    fontSize: Typography.sizes.base,
    textAlign: 'center',
    marginTop: Spacing.sm,
    lineHeight: 22,
  },
  resultsContent: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xl,
    flexGrow: 1,
  },
  imageCard: {
    marginBottom: Spacing.lg,
    overflow: 'hidden',
  },
  previewImage: {
    width: '100%',
    height: 320,
    backgroundColor: Colors.backgroundLighter,
  },
  resultCard: {
    marginBottom: Spacing.md,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  resultTitleContainer: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  resultTitle: {
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.bold,
    color: Colors.primary,
    marginBottom: Spacing.xs,
  },
  resultSubtitle: {
    fontSize: Typography.sizes.base,
    color: Colors.textSecondary,
    fontStyle: 'italic',
  },
  resultCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  resultCardTitle: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
    marginLeft: Spacing.sm,
  },
  resultText: {
    fontSize: Typography.sizes.base,
    color: Colors.textSecondary,
    lineHeight: 24,
  },
  conditionsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  conditionItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.backgroundLighter,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  conditionText: {
    color: Colors.textSecondary,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
    marginLeft: Spacing.sm,
  },
  addButton: {
    marginTop: Spacing.md,
    marginBottom: Spacing.md,
  },
});
