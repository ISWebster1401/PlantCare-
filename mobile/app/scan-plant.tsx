/**
 * Scanner de Plantas - Con modo oscuro (useThemeColors)
 */
import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Alert,
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
  Modal,
  SafeAreaView,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { plantsAPI } from '../services/api';
import { PlantIdentify, PlantResponse } from '../types';
import { SpeciesSelector } from '../components/SpeciesSelector';
import { Model3DViewer } from '../components/Model3DViewer';
import { Button, Card, Badge } from '../components/ui';
import { ScannerSelection } from '../components/scanner/ScannerSelection';
import { LiveScanner } from '../components/scanner/LiveScanner';
import { Typography, Spacing, BorderRadius, Shadows } from '../constants/DesignSystem';
import { useThemeColors, useThemeGradients } from '../context/ThemeContext';

type Step = 'selection' | 'name' | 'photo' | 'live' | 'identifying' | 'results' | 'creating' | 'created';

export default function ScanPlantScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const gradients = useThemeGradients();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [step, setStep] = useState<Step>('selection');
  const [plantName, setPlantName] = useState('');
  const [plantSpecies, setPlantSpecies] = useState('');
  const [photo, setPhoto] = useState<{ uri: string; type: string; name: string } | null>(null);
  const [identification, setIdentification] = useState<PlantIdentify | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [createdPlant, setCreatedPlant] = useState<PlantResponse | null>(null);

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

  /** Desde ScannerSelection (galería): solo elegir foto y pasar al paso nombre */
  const pickFromGalleryForSelection = async () => {
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
        setStep('name');
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
      const plant = await plantsAPI.createPlant(photo, plantName.trim(), plantSpecies.trim() || undefined);
      setCreatedPlant(plant);
      setStep('created');
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
      case 'selection':
        return (
          <ScannerSelection
            onBack={() => router.back()}
            onSelect={(mode) => {
              if (mode === 'live') {
                setStep('live');
              } else {
                requestMediaLibraryPermission().then((ok) => {
                  if (ok) pickFromGalleryForSelection();
                });
              }
            }}
          />
        );

      case 'live':
        return (
          <LiveScanner
            onCancel={() => setStep('selection')}
            onComplete={(uri) => {
              setPhoto({
                uri,
                type: 'image/jpeg',
                name: `plant_${Date.now()}.jpg`,
              });
              setStep('name');
            }}
          />
        );

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
              <Ionicons name="leaf-outline" size={20} color={colors.textSecondary} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Nombre de la planta (ej: Pepito, Rosita...)"
                placeholderTextColor={colors.textMuted}
                value={plantName}
                onChangeText={setPlantName}
                autoFocus
              />
            </View>

            <Text style={styles.inputLabel}>Especie (opcional)</Text>
            <SpeciesSelector
              selectedSpecies={plantSpecies || null}
              onSelect={(species) => setPlantSpecies(species || '')}
            />

            <Text style={styles.hintText}>
              Si conoces la especie, selecciónala para una identificación más precisa
            </Text>

            <Button
              title="Continuar"
              onPress={() => {
                if (photo) {
                  setStep('identifying');
                  identifyPlant(photo.uri);
                } else {
                  setStep('photo');
                }
              }}
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
                    <Ionicons name="camera" size={40} color={colors.primary} />
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
                    <Ionicons name="images" size={40} color={colors.primary} />
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
              <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
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
                <Image source={{ uri: photo.uri }} style={styles.previewImage} contentFit="cover" />
              </Card>
            )}

            <Card variant="elevated" style={styles.resultCard}>
              <View style={styles.resultHeader}>
                <Ionicons name="checkmark-circle" size={32} color={colors.primary} />
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
                <Ionicons name="bulb-outline" size={24} color={colors.accent} />
                <Text style={styles.resultCardTitle}>Consejos de cuidado</Text>
              </View>
              <View style={styles.tipsContainer}>
                {(Array.isArray(identification.care_tips)
                  ? identification.care_tips
                  : (identification.care_tips || '').split(/[;\n]/).filter((t: string) => t.trim())
                ).map((tip: string, idx: number) => (
                  <View key={idx} style={styles.tipRow}>
                    <View style={styles.tipBullet} />
                    <Text style={styles.tipText}>
                      {tip.replace(/^[-*•]\s*/, '').trim()}
                    </Text>
                  </View>
                ))}
              </View>
            </Card>

            <Card variant="elevated" style={styles.resultCard}>
              <View style={styles.resultCardHeader}>
                <Ionicons name="stats-chart" size={24} color={colors.secondary} />
                <Text style={styles.resultCardTitle}>Condiciones óptimas</Text>
              </View>
              <View style={styles.conditionsRow}>
                <View style={styles.conditionItem}>
                  <Ionicons name="water" size={20} color={colors.secondary} />
                  <Text style={styles.conditionText}>
                    {identification.optimal_humidity_min}% - {identification.optimal_humidity_max}%
                  </Text>
                </View>
                <View style={styles.conditionItem}>
                  <Ionicons name="thermometer" size={20} color={colors.error} />
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
              <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
              <Text style={styles.loadingText}>Creando tu planta...</Text>
              <Text style={styles.loadingSubtext}>
                Generando el personaje único de <Text style={{ fontWeight: Typography.weights.bold }}>{plantName}</Text>
              </Text>
            </View>
          </View>
        );

      case 'created':
        if (!createdPlant) return null;
        const createdImageUri =
          createdPlant.character_image_url ||
          createdPlant.default_render_url ||
          createdPlant.original_photo_url ||
          undefined;
        const createdMood = (createdPlant.character_mood || 'happy') as string;

        return (
          <ScrollView style={styles.stepContainer} contentContainerStyle={styles.createdContent}>
            <View style={styles.iconContainer}>
              <View style={[styles.iconCircle, { borderColor: colors.success, backgroundColor: `${colors.success}20` }]}>
                <Text style={styles.iconEmoji}>✅</Text>
              </View>
            </View>

            <Text style={styles.stepTitle}>¡Planta agregada al jardín!</Text>
            <Text style={styles.stepDescription}>
              Así se ve el personaje de <Text style={{ fontWeight: Typography.weights.bold, color: colors.text }}>{createdPlant.plant_name || plantName}</Text>
            </Text>

            {/* Imagen del personaje */}
            {createdImageUri && (
              <View style={styles.createdImageWrapper}>
                <Image
                  source={{ uri: createdImageUri }}
                  style={styles.createdImage}
                  contentFit="cover"
                />
              </View>
            )}

            {/* Modelo 3D si existe */}
            {createdPlant.model_3d_url && (
              <View style={styles.created3dWrapper}>
                <Text style={styles.created3dLabel}>Modelo 3D</Text>
                <Model3DViewer
                  modelUrl={createdPlant.model_3d_url}
                  style={styles.created3dViewer}
                  autoRotate
                  characterMood={createdMood}
                />
              </View>
            )}

            {/* Info rápida */}
            {createdPlant.plant_type && (
              <View style={styles.createdInfoRow}>
                <Ionicons name="leaf" size={16} color={colors.primaryLight} />
                <Text style={styles.createdInfoText}>
                  {createdPlant.plant_type}
                  {createdPlant.scientific_name ? ` — ${createdPlant.scientific_name}` : ''}
                </Text>
              </View>
            )}

            <Button
              title="Ver en mi jardín"
              onPress={() => router.replace('/(tabs)/garden')}
              variant="primary"
              size="lg"
              icon="leaf"
              iconPosition="left"
              fullWidth
              style={styles.addButton}
            />

            <Button
              title="Escanear otra planta"
              onPress={() => {
                setStep('selection');
                setPhoto(null);
                setPlantName('');
                setPlantSpecies('');
                setIdentification(null);
                setCreatedPlant(null);
              }}
              variant="ghost"
              size="md"
              icon="add-circle-outline"
              iconPosition="left"
              fullWidth
            />
          </ScrollView>
        );

      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={gradients.primary as [string, string]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.closeButton}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="close" size={24} color={colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Escanear Planta</Text>
        <View style={styles.closeButtonPlaceholder} />
      </LinearGradient>

      {renderStep()}
    </View>
  );
}

function createStyles(colors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
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
    color: colors.white,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.2)',
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
    backgroundColor: `${colors.primary}20`,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: colors.primary,
  },
  iconEmoji: {
    fontSize: 64,
  },
  stepTitle: {
    fontSize: Typography.sizes.xxl,
    fontWeight: Typography.weights.bold,
    color: colors.text,
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  stepDescription: {
    fontSize: Typography.sizes.base,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.xl,
    lineHeight: 22,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundLighter,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: colors.backgroundLighter,
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
    color: colors.text,
    paddingVertical: 0,
  },
  hintText: {
    fontSize: Typography.sizes.sm,
    color: colors.textMuted,
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
    backgroundColor: `${colors.primary}15`,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  photoCardText: {
    color: colors.text,
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
    color: colors.text,
    fontSize: Typography.sizes.xl,
    textAlign: 'center',
    marginTop: Spacing.md,
    fontWeight: Typography.weights.semibold,
  },
  loadingSubtext: {
    color: colors.textSecondary,
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
    backgroundColor: colors.backgroundLighter,
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
    color: colors.primary,
    marginBottom: Spacing.xs,
  },
  resultSubtitle: {
    fontSize: Typography.sizes.base,
    color: colors.textSecondary,
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
    color: colors.text,
    marginLeft: Spacing.sm,
  },
  resultText: {
    fontSize: Typography.sizes.base,
    color: colors.textSecondary,
    lineHeight: 24,
  },
  tipsContainer: {
    gap: Spacing.sm,
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  tipBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
    marginTop: 7,
    marginRight: 12,
  },
  tipText: {
    flex: 1,
    fontSize: Typography.sizes.base,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  inputLabel: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
    color: colors.textSecondary,
    marginBottom: Spacing.sm,
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
    backgroundColor: colors.backgroundLighter,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  conditionText: {
    color: colors.textSecondary,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
    marginLeft: Spacing.sm,
  },
  addButton: {
    marginTop: Spacing.md,
    marginBottom: Spacing.md,
  },
  /* ── Created step ── */
  createdContent: {
    padding: Spacing.lg,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.xl * 2,
    flexGrow: 1,
  },
  createdImageWrapper: {
    alignSelf: 'center',
    width: 220,
    height: 220,
    borderRadius: 110,
    overflow: 'hidden',
    borderWidth: 4,
    borderColor: colors.primary,
    backgroundColor: colors.backgroundLighter,
    marginBottom: Spacing.lg,
  },
  createdImage: {
    width: '100%',
    height: '100%',
  },
  created3dWrapper: {
    alignSelf: 'center',
    width: '100%',
    height: 240,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    backgroundColor: colors.backgroundLighter,
    marginBottom: Spacing.lg,
    borderWidth: 2,
    borderColor: colors.primaryLight,
  },
  created3dLabel: {
    position: 'absolute',
    top: Spacing.sm,
    alignSelf: 'center',
    zIndex: 10,
    fontSize: Typography.sizes.xs,
    color: colors.textSecondary,
    backgroundColor: `${colors.background}CC`,
    paddingHorizontal: Spacing.md,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
    overflow: 'hidden',
  },
  created3dViewer: {
    flex: 1,
  },
  createdInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: Spacing.lg,
    gap: Spacing.xs,
  },
  createdInfoText: {
    fontSize: Typography.sizes.base,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  });
}
