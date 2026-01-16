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
import { useMaster } from "@/contexts/MasterContext";
import { getInitials } from "@/utils/string";

type ProjectsScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, "Main">;

// ... imports
import { useAuth } from "@/contexts/AuthContext";
import { GlobalProjectGallery } from "@/components/GlobalProjectGallery";

export default function MasterProjectsScreen() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const insets = useScreenInsets();
  const navigation = useNavigation<ProjectsScreenNavigationProp>();
  const { selectedApprenticeId, apprentices } = useMaster();
  const [apprenticeProjects, setApprenticeProjects] = useState<any[]>([]);
  const [commentModalVisible, setCommentModalVisible] = useState(false);
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [commentText, setCommentText] = useState("");
  const [isCardSwiping, setIsCardSwiping] = useState(false);

  const [viewMode, setViewMode] = useState<"apprentice" | "global">("apprentice");
  const [allProjects, setAllProjects] = useState<any[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useFocusEffect(
    React.useCallback(() => {
      const loadData = async () => {
        setLoading(true);
        try {
          const users = await api.getUsers();
          setAllUsers(users);

          if (viewMode === "apprentice") {
            if (selectedApprenticeId) {
              const projs = await api.getProjects(selectedApprenticeId);
              const appName = apprentices.find(a => a.apprenticeId === selectedApprenticeId)?.apprenticeName;
              setApprenticeProjects(projs.map(p => ({ ...p, apprenticeName: appName })));
            } else {
              // All apprentices
              const promises = apprentices.map(async (a) => {
                const projs = await api.getProjects(a.apprenticeId).catch(() => []);
                return projs.map((p: any) => ({ ...p, apprenticeName: a.apprenticeName }));
              });
              const results = await Promise.all(promises);
              // Sort by date desc
              const sorted = results.flat().sort((a: any, b: any) => {
                const tA = a.created_at ? new Date(a.created_at).getTime() : 0;
                const tB = b.created_at ? new Date(b.created_at).getTime() : 0;
                return tB - tA;
              });
              setApprenticeProjects(sorted);
            }
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
    }, [viewMode, selectedApprenticeId, apprentices])
  );

  /* REMOVED EARLY RETURN */

  // const projects = viewMode === "global" ? allProjects : apprenticeProjects;
  const projects = apprenticeProjects;

  const filteredProjects = React.useMemo(() => {
    return projects;
  }, [projects]);

  const getAuthorName = (userId: string) => {
    const u = allUsers.find((u: any) => u.id === userId);
    return u ? u.name : "Neznámý autor";
  };



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

      setApprenticeProjects(prev => prev.map(p =>
        p.id === selectedProject.id ? { ...p, master_comment: newComment } : p
      ));
    } catch (error) {
      console.error("Error saving comment:", error);
    }
  };

  const handleAddHeart = async (projectId: string) => {
    try {
      const currentProject = apprenticeProjects.find((p: any) => p.id === projectId);
      if (!currentProject) return;

      const newIsLiked = !currentProject.is_liked;
      await api.toggleProjectLike(projectId as any, newIsLiked);

      setApprenticeProjects(prev => prev.map(p =>
        p.id === projectId ? { ...p, is_liked: newIsLiked } : p
      ));
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



      {viewMode === "global" ? (
        <GlobalProjectGallery />
      ) : filteredProjects.length === 0 ? (
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
                projectIndex: filteredProjects.indexOf(item),
                apprenticeId: viewMode === "apprentice" ? item.user_id : undefined,
                isGlobal: false
              })}
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
              authorName={undefined}
              masterInitials={viewMode === "apprentice" ? getInitials(item.apprenticeName || "??") : undefined}
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
