import React, { useState, useEffect } from "react";
import { View, StyleSheet, FlatList, Pressable, TextInput, Modal, Image, KeyboardAvoidingView, Keyboard, Platform, ScrollView, RefreshControl } from "react-native";
import { Feather } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";
import { useFocusEffect } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "@/navigation/RootNavigator";
import { SwipeableProjectCard } from "@/components/SwipeableProjectCard";
import { EmptyState } from "@/components/EmptyState";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { useScreenInsets } from "@/hooks/useScreenInsets";
import { Spacing, Typography, BorderRadius } from "@/constants/theme";
import { useData, Project } from "@/contexts/DataContext";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/services/api";
import { GlobalProjectGallery } from "@/components/GlobalProjectGallery";

type ProjectsScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, "Main">;
import { getInitials } from "@/utils/string";

export default function ProjectsScreen() {
  const { theme } = useTheme();
  const insets = useScreenInsets();
  const navigation = useNavigation<ProjectsScreenNavigationProp>();
  const { user } = useAuth();
  const { userData, addProject, updateProject, removeProject, getMasterCraft, allUsers: globalAllUsers, isLoading, refreshData } = useData();
  const [modalVisible, setModalVisible] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [newProjectTitle, setNewProjectTitle] = useState("");
  const [newProjectDescription, setNewProjectDescription] = useState("");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedApprenticeData, setSelectedApprenticeData] = useState<any>(null);
  const [allProjects, setAllProjects] = useState<any[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<"personal" | "global">("personal");

  const isHost = user?.role === "Host";

  useFocusEffect(
    React.useCallback(() => {
      const loadData = async () => {
        if (isHost || viewMode === "global") {
          setLoading(true);
          try {
            const [projs, users] = await Promise.all([
              api.getAllProjects(),
              api.getUsers()
            ]);
            setAllProjects(projs);
            setAllUsers(users);
          } catch (error) {
            console.error("Chyba při načítání dat:", error);
          } finally {
            setLoading(false);
          }
        }
      };
      loadData();
    }, [viewMode, isHost])
  );

  // const projects = (isHost || viewMode === "global")
  //   ? allProjects
  //   : userData.projects; // Apprentice sees ALL their projects in personal view
  const projects = React.useMemo(() => {
    if (userData.selectedMasterId) {
      return userData.projects.filter(p => p.master_id === userData.selectedMasterId);
    }
    return userData.projects;
  }, [userData.projects, userData.selectedMasterId]);



  const getAuthorName = (userId: string) => {
    const u = allUsers.find(user => user.id === userId);
    return u ? u.name : "Neznámý autor";
  };

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
    });

    if (!result.canceled) {
      try {
        // Convert image to base64 using fetch
        const response = await fetch(result.assets[0].uri);
        const blob = await response.blob();
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = reader.result as string;
          setSelectedImage(base64);
        };
        reader.readAsDataURL(blob);
      } catch (error) {
        console.error("Error converting image:", error);
        setSelectedImage(result.assets[0].uri);
      }
    }
  };

  const openEditModal = (project: Project) => {
    setEditingProject(project);
    setNewProjectTitle(project.title);
    setNewProjectDescription(project.description);
    setSelectedImage(project.image || null);
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setEditingProject(null);
    setNewProjectTitle("");
    setNewProjectDescription("");
    setSelectedImage(null);
  };

  const handleAddProject = () => {
    console.log("handleAddProject called, title:", newProjectTitle);
    if (newProjectTitle.trim()) {
      const projectData = {
        title: newProjectTitle,
        category: getMasterCraft(),
        photos: selectedImage ? 1 : 0,
        description: newProjectDescription,
        image: selectedImage || undefined,
      };

      if (editingProject) {
        console.log("Updating project:", newProjectTitle);
        updateProject(editingProject.id, projectData);
      } else {
        console.log("Adding new project:", newProjectTitle);
        addProject(projectData);
      }
      closeModal();
      if (editingProject) {
        navigation.reset({
          index: 1,
          routes: [
            { name: "Main" },
            { name: "Main", params: { screen: "Projects" } },
          ],
        });
      }
    } else {
      console.log("Title is empty, not adding");
    }
  };

  return (
    <View style={[styles.screenContainer, { backgroundColor: theme.backgroundRoot }]}>
      {!isHost && (
        <View style={[styles.toggleContainer, { backgroundColor: theme.backgroundDefault, borderBottomColor: theme.border }]}>
          <Pressable
            style={[styles.toggleButton, viewMode === "personal" && { borderBottomColor: theme.primary, borderBottomWidth: 3 }]}
            onPress={() => setViewMode("personal")}
          >
            <ThemedText style={[styles.toggleText, viewMode === "personal" ? { color: theme.primary, fontWeight: "700" } : { color: theme.textSecondary }]}>
              Moje díla
            </ThemedText>
          </Pressable>
          <Pressable
            style={[styles.toggleButton, viewMode === "global" && { borderBottomColor: theme.primary, borderBottomWidth: 3 }]}
            onPress={() => setViewMode("global")}
          >
            <ThemedText style={[styles.toggleText, viewMode === "global" ? { color: theme.primary, fontWeight: "700" } : { color: theme.textSecondary }]}>
              Galerie Cechu
            </ThemedText>
          </Pressable>
        </View>
      )}
      {!isHost && viewMode === "global" ? (
        <GlobalProjectGallery />
      ) : projects.length === 0 ? (
        <View style={styles.emptyContainer}>
          <EmptyState
            title="Zatím žádné projekty"
            message="Začni dokumentovat svou řemeslnou cestu přidáním prvního projektu!"
          />
        </View>
      ) : (
        <FlatList
          data={projects}
          keyExtractor={(item) => String(item.id)}
          refreshControl={
            <RefreshControl
              refreshing={isLoading}
              onRefresh={refreshData}
              colors={[theme.primary]}
              tintColor={theme.primary}
            />
          }
          ListHeaderComponent={
            <View style={{ paddingTop: Spacing.md, paddingBottom: Spacing.sm }}>
              <ThemedText style={{ fontSize: 24, fontWeight: "800", textAlign: "center" }}>Projekty</ThemedText>
            </View>
          }
          renderItem={({ item }) => (
            <SwipeableProjectCard
              title={item.title}
              date={item.created_at ? new Date(item.created_at).toLocaleDateString("cs-CZ", { day: "numeric", month: "long", year: "numeric" }) : "Neznámé datum"}
              imageUrl={item.image ? { uri: item.image } : undefined}
              category={item.category}
              onPress={() => navigation.navigate("ProjectDetail", {
                project: item,
                projectIndex: projects.indexOf(item),
                isGlobal: false,
                projectList: projects, // Pass the filtered list
              })}
              onEdit={() => openEditModal(item)}
              onDelete={() => removeProject(item.id)}
              masterComment={item.master_comment}
              isLiked={item.is_liked}
              masterInitials={(item.master_id ? getInitials(globalAllUsers.find(u => u.id === item.master_id)?.name || "") : undefined)}
              masterName={(item.master_id ? globalAllUsers.find(u => u.id === item.master_id)?.name : undefined)}
              hideDelete={false}
              description={item.description}
            />
          )}
          contentContainerStyle={[
            styles.listContent,
            {
              paddingTop: Spacing.xl + 8,
              paddingBottom: insets.bottom + 120, // Extra space for floating button
            },
          ]}
          style={styles.container}
          showsVerticalScrollIndicator={false}
        />
      )}

      {!isHost && viewMode === "personal" && (
        <Pressable
          disabled={!userData.selectedMasterId}
          style={({ pressed }) => [
            styles.addProjectButton,
            {
              backgroundColor: !userData.selectedMasterId ? theme.border : theme.primary,
              opacity: !userData.selectedMasterId ? 0.5 : (pressed ? 0.8 : 1),
              bottom: insets.bottom + Spacing.xs, // Reduced to minimum spacing
            },
          ]}
          onPress={() => {
            if (!userData.selectedMasterId) return;
            console.log("Add project button pressed");
            setEditingProject(null);
            setNewProjectTitle("");
            setNewProjectDescription("");
            setSelectedImage(null);
            setModalVisible(true);
          }}
        >
          <Feather name="plus" size={32} color="#FFFFFF" />
        </Pressable>
      )}

      <Modal visible={modalVisible} transparent={true} animationType="slide">
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
        >
          <Pressable
            style={[styles.modalOverlay, { backgroundColor: "rgba(0,0,0,0.5)" }]}
            onPress={() => { Keyboard.dismiss(); closeModal(); }}
          >
            <Pressable style={[styles.modalContent, { backgroundColor: theme.backgroundDefault }]} onPress={() => { }}>
              <ScrollView scrollEnabled={true} bounces={false}>
                <View style={styles.modalHeader}>
                  <View>
                    <ThemedText style={styles.modalTitle}>
                      {editingProject ? "Upravit projekt" : "Nový projekt"}
                    </ThemedText>
                    <ThemedText style={[styles.masterLabel, { color: theme.textSecondary }]}>
                      Pro mistra: {globalAllUsers.find(u => u.id === (editingProject?.master_id || userData.selectedMasterId))?.name || "Neznámý mistr"}
                    </ThemedText>
                  </View>
                  <Pressable onPress={() => { Keyboard.dismiss(); closeModal(); }}>
                    <Feather name="x" size={24} color={theme.text} />
                  </Pressable>
                </View>

                <View style={styles.scrollContainer}>
                  <TextInput
                    style={[
                      styles.input,
                      {
                        backgroundColor: theme.backgroundRoot,
                        borderColor: theme.border,
                        color: theme.text,
                      },
                    ]}
                    placeholder="Název projektu"
                    placeholderTextColor={theme.textSecondary}
                    value={newProjectTitle}
                    onChangeText={setNewProjectTitle}
                  />

                  <Pressable
                    onPress={pickImage}
                    style={({ pressed }) => [
                      styles.imagePickerButton,
                      {
                        backgroundColor: selectedImage ? theme.primary + "20" : theme.backgroundRoot,
                        borderColor: selectedImage ? theme.primary : theme.border,
                        opacity: pressed ? 0.7 : 1,
                      },
                    ]}
                  >
                    {selectedImage ? (
                      <>
                        <Image source={{ uri: selectedImage }} style={styles.selectedImage} />
                        <View style={styles.imageOverlay}>
                          <Feather name="camera" size={24} color={theme.primary} />
                          <ThemedText style={[styles.imageButtonText, { color: theme.primary }]}>Změnit fotku</ThemedText>
                        </View>
                      </>
                    ) : (
                      <>
                        <Feather name="image" size={32} color={theme.textSecondary} />
                        <ThemedText style={[styles.imageButtonText, { color: theme.textSecondary }]}>Vybrat fotku</ThemedText>
                      </>
                    )}
                  </Pressable>

                  <TextInput
                    style={[
                      styles.input,
                      styles.descriptionInput,
                      {
                        backgroundColor: theme.backgroundRoot,
                        borderColor: theme.border,
                        color: theme.text,
                      },
                    ]}
                    placeholder="Popis projektu (volitelně)"
                    placeholderTextColor={theme.textSecondary}
                    value={newProjectDescription}
                    onChangeText={setNewProjectDescription}
                    multiline
                  />
                </View>

                <View style={styles.modalActions}>
                  <Pressable
                    style={({ pressed }) => [
                      styles.cancelButton,
                      { opacity: pressed ? 0.7 : 1 },
                    ]}
                    onPress={() => { Keyboard.dismiss(); closeModal(); }}
                  >
                    <ThemedText style={[styles.cancelText, { color: theme.textSecondary }]}>
                      Zrušit
                    </ThemedText>
                  </Pressable>

                  <Pressable
                    style={({ pressed }) => [
                      styles.createButton,
                      {
                        backgroundColor: theme.primary,
                        opacity: pressed ? 0.8 : 1,
                      },
                    ]}
                    onPress={() => { Keyboard.dismiss(); handleAddProject(); }}
                  >
                    <ThemedText style={styles.createText}>
                      {editingProject ? "Uložit" : "Vytvořit"}
                    </ThemedText>
                  </Pressable>
                </View>
              </ScrollView>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    position: "relative",
  },
  container: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: Spacing.lg,
  },
  projectItem: {
    marginBottom: Spacing.md,
  },
  addProjectButton: {
    position: "absolute",
    bottom: 20, // This is overridden by inline style
    // right: 20, // Removed to center
    alignSelf: "center", // Center horizontally
    zIndex: 10,
    alignItems: "center",
    justifyContent: "center",
    width: 60, // Fixed size for circle
    height: 60, // Fixed size for circle
    borderRadius: 30, // Half of width/height
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  toggleContainer: {
    flexDirection: "row",
    height: 50,
    borderBottomWidth: 1,
    marginTop: Spacing.md,
  },
  toggleButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  toggleText: {
    ...Typography.body,
  },
  addProjectText: {
    ...Typography.body,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalContent: {
    borderTopLeftRadius: BorderRadius.lg,
    borderTopRightRadius: BorderRadius.lg,
    padding: Spacing.lg,
    maxHeight: "85%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  modalTitle: {
    ...Typography.h4,
    marginBottom: Spacing.xs,
  },
  masterLabel: {
    ...Typography.small,
  },
  scrollContainer: {
    marginBottom: Spacing.lg,
  },
  input: {
    borderRadius: BorderRadius.xs,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    marginBottom: Spacing.lg,
    ...Typography.body,
  },
  descriptionInput: {
    minHeight: 80,
  },
  imagePickerButton: {
    borderRadius: BorderRadius.sm,
    borderWidth: 2,
    borderStyle: "dashed",
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 150,
  },
  selectedImage: {
    width: "100%",
    height: "100%",
    borderRadius: BorderRadius.sm,
    position: "absolute",
  },
  imageOverlay: {
    alignItems: "center",
    gap: Spacing.sm,
    zIndex: 1,
  },
  imageButtonText: {
    ...Typography.body,
    fontWeight: "600",
  },
  modalActions: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    alignItems: "center",
    borderRadius: BorderRadius.xs,
  },
  cancelText: {
    ...Typography.body,
    fontWeight: "600",
  },
  createButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    alignItems: "center",
    borderRadius: BorderRadius.xs,
  },
  createText: {
    ...Typography.body,
    fontWeight: "600",
    color: "#FFFFFF",
  },
});
