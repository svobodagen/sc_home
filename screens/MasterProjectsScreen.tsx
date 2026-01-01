import React, { useState } from "react";
import { View, StyleSheet, FlatList, Pressable, Modal, TextInput, Keyboard, KeyboardAvoidingView, ScrollView, Platform, Switch } from "react-native";
import { Feather } from "@expo/vector-icons";
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
import { api } from "@/services/api";
import { NoApprenticeSelected } from "@/components/NoApprenticeSelected";

type ProjectsScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, "Main">;

// ... imports
import { useAuth } from "@/contexts/AuthContext"; // Add this

export default function MasterProjectsScreen() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const insets = useScreenInsets();
  const navigation = useNavigation<ProjectsScreenNavigationProp>();
  const [selectedApprenticeData, setSelectedApprenticeData] = useState<any>(null);
  const [commentModalVisible, setCommentModalVisible] = useState(false);
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [commentText, setCommentText] = useState("");
  const [isCardSwiping, setIsCardSwiping] = useState(false);
  const [showAllHistory, setShowAllHistory] = useState(false);
  const [viewMode, setViewMode] = useState<"apprentice" | "global">("apprentice");
  const [allProjects, setAllProjects] = useState<any[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useFocusEffect(
    React.useCallback(() => {
      const loadData = async () => {
        setLoading(true);
        try {
          // 1. Get apprentice info from storage to know WHO to load
          const data = await AsyncStorage.getItem("masterSelectedApprenticeData");
          const users = await api.getUsers();
          setAllUsers(users);

          if (data) {
            const parsedApprentice = JSON.parse(data);
            // 2. FETCH FRESH DATA from API for this apprentice
            const apprenticeProjects = await api.getProjects(parsedApprentice.id);

            setSelectedApprenticeData({
              ...parsedApprentice,
              projects: apprenticeProjects
            });
          } else {
            setSelectedApprenticeData(null);
          }

          // 3. Load all projects if in global mode
          if (viewMode === "global") {
            const projs = await api.getAllProjects();
            setAllProjects(projs);
          }
        } catch (error) {
          console.error("Error loading master projects data:", error);
        } finally {
          setLoading(false);
        }
      };
      loadData();
    }, [viewMode])
  );

  /* REMOVED EARLY RETURN */

  const projects = viewMode === "global" ? allProjects : (selectedApprenticeData?.projects || []);

  const filteredProjects = React.useMemo(() => {
    if (viewMode === "global") return projects;
    if (showAllHistory) return projects;
    return projects.filter((p: any) => !p.master_id || p.master_id === user?.id);
  }, [projects, showAllHistory, user?.id, viewMode]);

  const getAuthorName = (userId: string) => {
    const u = allUsers.find((u: any) => u.id === userId);
    return u ? u.name : "Neznámý autor";
  };

  if (!selectedApprenticeData && viewMode === "apprentice") {
    return (
      <View style={{ flex: 1, backgroundColor: theme.backgroundRoot }}>
        <View style={[styles.toggleContainer, { backgroundColor: theme.backgroundDefault, borderBottomColor: theme.border }]}>
          <Pressable
            style={[styles.toggleButton, { borderBottomColor: theme.primary, borderBottomWidth: 3 }]}
            onPress={() => setViewMode("apprentice")}
          >
            <ThemedText style={[styles.toggleText, { color: theme.primary, fontWeight: "700" }]}>
              Učedník
            </ThemedText>
          </Pressable>
          <Pressable
            style={[styles.toggleButton]}
            onPress={() => setViewMode("global")}
          >
            <ThemedText style={[styles.toggleText, { color: theme.textSecondary }]}>
              Galerie Cechu
            </ThemedText>
          </Pressable>
        </View>
        <NoApprenticeSelected />
      </View>
    );
  }

  const extractTextOnly = (fullComment: string): string => {
    if (!fullComment) return "";
    let text = fullComment.trim();
    while (text.startsWith("♥")) {
      text = text.slice(1).trim();
    }
    return text;
  };

  const extractHeartsOnly = (fullComment: string): string => {
    if (!fullComment) return "";
    let hearts = "";
    let i = 0;
    while (i < fullComment.length && fullComment[i] === "♥") {
      hearts += "♥";
      i++;
      while (i < fullComment.length && fullComment[i] === " ") {
        i++;
      }
    }
    return hearts;
  };

  const handleSaveComment = async () => {
    if (!selectedProject) return;
    try {
      const originalComment = selectedProject.master_comment || "";
      const hearts = extractHeartsOnly(originalComment);
      const newComment = hearts ? `${hearts} ${commentText}`.trim() : commentText;

      await api.updateProject(selectedProject.id, { master_comment: newComment });
      setCommentModalVisible(false);
      setSelectedProject(null);
      setCommentText("");

      const data = await AsyncStorage.getItem("masterSelectedApprenticeData");
      if (data) {
        const parsed = JSON.parse(data);
        const updatedProjects = parsed.projects.map((p: any) =>
          p.id === selectedProject.id ? { ...p, master_comment: newComment } : p
        );
        await AsyncStorage.setItem("masterSelectedApprenticeData", JSON.stringify({ ...parsed, projects: updatedProjects }));
        setSelectedApprenticeData({ ...parsed, projects: updatedProjects });
      }
    } catch (error) {
      console.error("Error saving comment:", error);
    }
  };

  const handleAddHeart = async (projectId: string) => {
    try {
      const data = await AsyncStorage.getItem("masterSelectedApprenticeData");
      if (data) {
        const parsed = JSON.parse(data);
        const currentProject = parsed.projects.find((p: any) => p.id === projectId);
        if (!currentProject) return;

        const newIsLiked = !currentProject.is_liked;
        await api.toggleProjectLike(projectId as any, newIsLiked);

        const updatedProjects = parsed.projects.map((p: any) =>
          p.id === projectId ? { ...p, is_liked: newIsLiked } : p
        );
        await AsyncStorage.setItem("masterSelectedApprenticeData", JSON.stringify({ ...parsed, projects: updatedProjects }));
        setSelectedApprenticeData({ ...parsed, projects: updatedProjects });
      }
    } catch (error) {
      console.error("Error toggling like:", error);
    }
  };

  return (
    <View style={[styles.screenContainer, { backgroundColor: theme.backgroundRoot }]}>
      <View style={[styles.toggleContainer, { backgroundColor: theme.backgroundDefault, borderBottomColor: theme.border }]}>
        <Pressable
          style={[styles.toggleButton, viewMode === "apprentice" && { borderBottomColor: theme.primary, borderBottomWidth: 3 }]}
          onPress={() => setViewMode("apprentice")}
        >
          <ThemedText style={[styles.toggleText, viewMode === "apprentice" ? { color: theme.primary, fontWeight: "700" } : { color: theme.textSecondary }]}>
            Učedník
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

      {viewMode === "apprentice" && (
        <View style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          paddingHorizontal: Spacing.lg,
          paddingVertical: Spacing.md,
          backgroundColor: theme.backgroundDefault,
          borderBottomWidth: 1,
          borderBottomColor: theme.border
        }}>
          <ThemedText style={{ ...Typography.label }}>Zobrazit celou historii</ThemedText>
          <Switch
            value={showAllHistory}
            onValueChange={setShowAllHistory}
            trackColor={{ false: theme.border, true: theme.primary }}
          />
        </View>
      )}

      {filteredProjects.length === 0 ? (
        <View style={styles.emptyContainer}>
          <EmptyState
            image={require("../assets/images/illustrations/empty_state_no_projects.png")}
            title="Zatím žádné projekty"
            message="Učedník zatím nedokumentoval žádné projekty"
          />
        </View>
      ) : (
        <FlatList
          data={filteredProjects}
          keyExtractor={(item) => item.id.toString()}
          scrollEnabled={!isCardSwiping}
          renderItem={({ item }) => (
            <SwipeableProjectCard
              title={item.title}
              date={item.created_at ? new Date(item.created_at).toLocaleDateString("cs-CZ", { day: "numeric", month: "long", year: "numeric" }) : "Neznámé datum"}
              imageUrl={item.image ? { uri: item.image } : undefined}
              category={item.category}
              onPress={() => navigation.navigate("ProjectDetail", { project: item, projectIndex: filteredProjects.indexOf(item) })}
              onEdit={() => {
                setSelectedProject(item);
                setCommentText(extractTextOnly(item.master_comment || ""));
                setCommentModalVisible(true);
              }}
              onDelete={() => { }}
              onLike={() => handleAddHeart(item.id)}
              onSwipeStart={() => setIsCardSwiping(true)}
              onSwipeEnd={() => setIsCardSwiping(false)}
              masterComment={item.master_comment}
              isLiked={item.is_liked}
              isMaster={viewMode === "apprentice"}
              hideDelete={true}
              authorName={viewMode === "global" ? getAuthorName(item.user_id) : undefined}
            />
          )}
          contentContainerStyle={[
            styles.listContent,
            {
              paddingTop: Spacing.xl,
              paddingBottom: insets.bottom + Spacing.lg,
            },
          ]}
          style={styles.container}
          showsVerticalScrollIndicator={false}
        />
      )}

      <Modal visible={commentModalVisible} transparent animationType="slide">
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
        >
          <Pressable style={[styles.modalOverlay, { backgroundColor: "rgba(0,0,0,0.5)" }]} onPress={() => Keyboard.dismiss()}>
            <Pressable style={[styles.modalContent, { backgroundColor: theme.backgroundDefault }]} onPress={() => { }}>
              <ScrollView scrollEnabled={true} bounces={false}>
                <View style={styles.modalHeader}>
                  <ThemedText style={styles.modalTitle}>Komentář k projektu</ThemedText>
                  <Pressable onPress={() => { Keyboard.dismiss(); setCommentModalVisible(false); }}>
                    <Feather name="x" size={24} color={theme.text} />
                  </Pressable>
                </View>
                <TextInput
                  style={[
                    styles.commentInput,
                    { backgroundColor: theme.backgroundRoot, color: theme.text, borderColor: theme.border },
                  ]}
                  placeholder="Napiš svůj komentář..."
                  placeholderTextColor={theme.textSecondary}
                  value={commentText}
                  onChangeText={setCommentText}
                  multiline
                  numberOfLines={6}
                />
                <Pressable
                  style={[styles.saveButton, { backgroundColor: theme.primary }]}
                  onPress={() => { Keyboard.dismiss(); handleSaveComment(); }}
                >
                  <ThemedText style={styles.saveButtonText}>Uložit komentář</ThemedText>
                </Pressable>
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
  container: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: Spacing.lg,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalContent: {
    borderTopLeftRadius: BorderRadius.lg,
    borderTopRightRadius: BorderRadius.lg,
    padding: Spacing.lg,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  modalTitle: {
    ...Typography.h4,
  },
  commentInput: {
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    textAlignVertical: "top",
  },
  saveButton: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
  },
  saveButtonText: {
    ...Typography.body,
    fontWeight: "600",
    color: "#FFFFFF",
  },
});
