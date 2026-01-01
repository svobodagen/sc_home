import React, { useState, useEffect } from "react";
import { View, Pressable, TextInput, FlatList, StyleSheet } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { ScreenKeyboardAwareScrollView } from "@/components/ScreenKeyboardAwareScrollView";
import { Colors, Spacing } from "@/constants/theme";
import { Feather } from "@expo/vector-icons";
import { Comment, Task } from "@/contexts/DataContext";
import { api } from "@/services/api";

interface ApprenticeData {
  projects: any[];
  workHours: any[];
  comments: Comment[];
  tasks: Task[];
}

export default function ApprenticeDetailScreen({ route }: any) {
  const { theme } = useTheme();
  const { user } = useAuth();
  const { apprenticeId, apprenticeName } = route.params;

  const [apprenticeData, setApprenticeData] = useState<ApprenticeData>({
    projects: [],
    workHours: [],
    comments: [],
    tasks: [],
  });
  const [newComment, setNewComment] = useState("");
  const [activeTab, setActiveTab] = useState<"overview" | "comments" | "tasks">("overview");

  useEffect(() => {
    loadApprenticeData();
  }, [apprenticeId]);

  const loadApprenticeData = async () => {
    try {
      console.log("📥 loadApprenticeData from Supabase for:", apprenticeId);
      let projects = [];
      let workHours = [];
      
      // CLOUD-FIRST: čti z API
      try {
        const allProjects = await api.getProjects(apprenticeId);
        projects = allProjects || [];
        
        const allHours = await api.getWorkHours(apprenticeId);
        workHours = allHours || [];
      } catch (apiError) {
        console.log("❌ API failed, loading from AsyncStorage");
        const storageKey = `userData_${apprenticeId}`;
        const saved = await AsyncStorage.getItem(storageKey);
        if (saved) {
          const data = JSON.parse(saved);
          projects = data.projects || [];
          workHours = data.workHours || [];
        }
      }
      
      // Načti komentáře a tasky z local storage (opaque data pro mistra)
      const storageKey = `userData_${apprenticeId}`;
      const saved = await AsyncStorage.getItem(storageKey);
      const comments = saved ? JSON.parse(saved).comments || [] : [];
      const tasks = saved ? JSON.parse(saved).tasks || [] : [];
      
      console.log("✅ Loaded:", projects.length, "projects,", workHours.length, "hours");
      setApprenticeData({
        projects,
        workHours,
        comments,
        tasks,
      });
    } catch (error) {
      console.error("Chyba při načítání dat učedníka:", error);
    }
  };

  const addComment = async () => {
    if (!newComment.trim() || !user) return;

    try {
      const comment: Comment = {
        id: Date.now().toString(),
        text: newComment,
        timestamp: Date.now(),
        userId: user.id,
        userName: user.name,
      };

      const updated = { ...apprenticeData, comments: [comment, ...apprenticeData.comments] };
      setApprenticeData(updated);

      const storageKey = `userData_${apprenticeId}`;
      const saved = await AsyncStorage.getItem(storageKey);
      if (saved) {
        const data = JSON.parse(saved);
        data.comments = updated.comments;
        await AsyncStorage.setItem(storageKey, JSON.stringify(data));
      }

      setNewComment("");
    } catch (error) {
      console.error("Chyba při přidávání komentáře:", error);
    }
  };

  const assignTask = async () => {
    if (!user) return;

    const task: Task = {
      id: Date.now().toString(),
      title: "Nový úkol",
      description: "",
      timestamp: Date.now(),
      completed: false,
      assignedBy: user.id,
    };

    try {
      const updated = { ...apprenticeData, tasks: [task, ...apprenticeData.tasks] };
      setApprenticeData(updated);

      const storageKey = `userData_${apprenticeId}`;
      const saved = await AsyncStorage.getItem(storageKey);
      if (saved) {
        const data = JSON.parse(saved);
        data.tasks = updated.tasks;
        await AsyncStorage.setItem(storageKey, JSON.stringify(data));
      }
    } catch (error) {
      console.error("Chyba při přidávání úkolu:", error);
    }
  };

  const getTotalHours = () => {
    return apprenticeData.workHours.reduce((sum, hour) => sum + hour.hours, 0);
  };

  const renderOverview = () => (
    <View style={styles.tabContent}>
      <ThemedView style={styles.card}>
        <ThemedText style={styles.cardTitle}>Statistika</ThemedText>
        <View style={styles.stats}>
          <View style={styles.statItem}>
            <ThemedText style={styles.statNumber}>{getTotalHours()}h</ThemedText>
            <ThemedText style={styles.statLabel}>Celkem hodin</ThemedText>
          </View>
          <View style={styles.statItem}>
            <ThemedText style={styles.statNumber}>{apprenticeData.projects.length}</ThemedText>
            <ThemedText style={styles.statLabel}>Projektů</ThemedText>
          </View>
        </View>
      </ThemedView>

      {apprenticeData.projects.length > 0 && (
        <ThemedView style={styles.card}>
          <ThemedText style={styles.cardTitle}>Poslední projekty</ThemedText>
          {apprenticeData.projects.slice(0, 3).map((project) => (
            <View key={project.id} style={styles.projectItem}>
              <ThemedText style={styles.projectTitle}>{project.title}</ThemedText>
              <ThemedText style={[styles.projectDate, { color: theme.textSecondary }]}>
                {new Date(project.timestamp).toLocaleDateString("cs-CZ")}
              </ThemedText>
            </View>
          ))}
        </ThemedView>
      )}

      {apprenticeData.workHours.length > 0 && (
        <ThemedView style={styles.card}>
          <ThemedText style={styles.cardTitle}>Poslední časy</ThemedText>
          {apprenticeData.workHours.slice(0, 3).map((hour) => (
            <View key={hour.id} style={styles.hourItem}>
              <View style={styles.hourInfo}>
                <ThemedText style={styles.hourHours}>{hour.hours}h</ThemedText>
                <ThemedText style={[styles.hourDesc, { color: theme.textSecondary }]}>
                  {hour.description}
                </ThemedText>
              </View>
              <ThemedText style={[styles.hourDate, { color: theme.textSecondary }]}>
                {new Date(hour.timestamp).toLocaleDateString("cs-CZ")}
              </ThemedText>
            </View>
          ))}
        </ThemedView>
      )}

      <Pressable
        style={({ pressed }) => [
          styles.certButton,
          { backgroundColor: Colors.light.success, opacity: pressed ? 0.8 : 1 },
        ]}
        onPress={() => {}}
      >
        <Feather name="award" size={20} color="#fff" />
        <ThemedText style={styles.certButtonText}>Certifikovat jako Tovaryše</ThemedText>
      </Pressable>

      <Pressable
        style={({ pressed }) => [
          styles.certButton,
          { backgroundColor: Colors.light.primary, opacity: pressed ? 0.8 : 1 },
        ]}
        onPress={() => {}}
      >
        <Feather name="crown" size={20} color="#fff" />
        <ThemedText style={styles.certButtonText}>Certifikovat jako Mistra</ThemedText>
      </Pressable>
    </View>
  );

  const renderComments = () => (
    <View style={styles.tabContent}>
      <ThemedView style={styles.commentForm}>
        <TextInput
          placeholder="Napsat komentář..."
          value={newComment}
          onChangeText={setNewComment}
          placeholderTextColor={theme.textSecondary}
          multiline
          style={[styles.commentInput, { color: theme.text, borderColor: theme.border }]}
        />
        <Pressable
          style={({ pressed }) => [
            styles.sendButton,
            { opacity: pressed ? 0.8 : 1 },
          ]}
          onPress={addComment}
        >
          <Feather name="send" size={18} color="#fff" />
        </Pressable>
      </ThemedView>

      <FlatList
        data={apprenticeData.comments}
        renderItem={({ item }) => (
          <ThemedView style={styles.commentCard}>
            <View style={styles.commentHeader}>
              <ThemedText style={styles.commentAuthor}>{item.userName}</ThemedText>
              <ThemedText style={styles.commentTime}>
                {new Date(item.timestamp).toLocaleDateString("cs-CZ")}
              </ThemedText>
            </View>
            <ThemedText style={styles.commentText}>{item.text}</ThemedText>
          </ThemedView>
        )}
        keyExtractor={(item) => item.id}
        scrollEnabled={false}
        ListEmptyComponent={
          <ThemedView style={styles.emptyView}>
            <ThemedText>Zatím žádné komentáře</ThemedText>
          </ThemedView>
        }
      />
    </View>
  );

  const renderTasks = () => (
    <View style={styles.tabContent}>
      <Pressable
        style={({ pressed }) => [
          styles.addTaskButton,
          { backgroundColor: Colors.light.primary, opacity: pressed ? 0.8 : 1 },
        ]}
        onPress={assignTask}
      >
        <Feather name="plus" size={20} color="#fff" />
        <ThemedText style={styles.addTaskButtonText}>Přidat úkol</ThemedText>
      </Pressable>

      <FlatList
        data={apprenticeData.tasks}
        renderItem={({ item }) => (
          <ThemedView style={styles.taskCard}>
            <View style={styles.taskHeader}>
              <ThemedText style={styles.taskTitle}>{item.title}</ThemedText>
              {item.completed && (
                <Feather name="check-circle" size={20} color={Colors.light.success} />
              )}
            </View>
            <ThemedText style={styles.taskDescription}>{item.description}</ThemedText>
          </ThemedView>
        )}
        keyExtractor={(item) => item.id}
        scrollEnabled={false}
        ListEmptyComponent={
          <ThemedView style={styles.emptyView}>
            <ThemedText>Zatím žádné úkoly</ThemedText>
          </ThemedView>
        }
      />
    </View>
  );

  return (
    <ScreenKeyboardAwareScrollView>
      <View style={styles.container}>
        <ThemedText style={styles.title}>{apprenticeName}</ThemedText>

        <View style={styles.tabs}>
          {["overview", "comments", "tasks"].map((tab) => (
            <Pressable
              key={tab}
              style={[
                styles.tab,
                activeTab === tab && {
                  borderBottomColor: Colors.light.primary,
                  borderBottomWidth: 2,
                },
              ]}
              onPress={() => setActiveTab(tab as any)}
            >
              <ThemedText
                style={[
                  styles.tabLabel,
                  activeTab === tab && { color: Colors.light.primary },
                ]}
              >
                {tab === "overview" ? "Přehled" : tab === "comments" ? "Komentáře" : "Úkoly"}
              </ThemedText>
            </Pressable>
          ))}
        </View>

        {activeTab === "overview" && renderOverview()}
        {activeTab === "comments" && renderComments()}
        {activeTab === "tasks" && renderTasks()}
      </View>
    </ScreenKeyboardAwareScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: Spacing.lg,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: Spacing.lg,
  },
  tabs: {
    flexDirection: "row",
    marginBottom: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  tab: {
    flex: 1,
    paddingVertical: Spacing.md,
    alignItems: "center",
  },
  tabLabel: {
    fontSize: 14,
    fontWeight: "600",
  },
  tabContent: {
    gap: Spacing.md,
  },
  card: {
    padding: Spacing.lg,
    borderRadius: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: Spacing.md,
  },
  stats: {
    flexDirection: "row",
    gap: Spacing.lg,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statNumber: {
    fontSize: 24,
    fontWeight: "bold",
  },
  statLabel: {
    fontSize: 12,
    opacity: 0.7,
    marginTop: Spacing.xs,
  },
  projectItem: {
    marginBottom: Spacing.md,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  projectTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: Spacing.xs,
  },
  projectDate: {
    fontSize: 12,
  },
  hourItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: Spacing.md,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  hourInfo: {
    flex: 1,
  },
  hourHours: {
    fontSize: 16,
    fontWeight: "600",
  },
  hourDesc: {
    fontSize: 12,
    marginTop: Spacing.xs,
  },
  hourDate: {
    fontSize: 12,
  },
  certButton: {
    flexDirection: "row",
    padding: Spacing.md,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.md,
  },
  certButtonText: {
    color: "#fff",
    fontWeight: "bold",
  },
  commentForm: {
    padding: Spacing.lg,
    borderRadius: 12,
    flexDirection: "row",
    gap: Spacing.md,
  },
  commentInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    padding: Spacing.md,
    minHeight: 50,
  },
  sendButton: {
    backgroundColor: Colors.light.primary,
    width: 40,
    height: 50,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  commentCard: {
    padding: Spacing.lg,
    borderRadius: 12,
    marginBottom: Spacing.md,
  },
  commentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: Spacing.sm,
  },
  commentAuthor: {
    fontWeight: "bold",
  },
  commentTime: {
    fontSize: 12,
    opacity: 0.7,
  },
  commentText: {
    fontSize: 14,
  },
  addTaskButton: {
    flexDirection: "row",
    padding: Spacing.md,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.md,
  },
  addTaskButtonText: {
    color: "#fff",
    fontWeight: "bold",
  },
  taskCard: {
    padding: Spacing.lg,
    borderRadius: 12,
    marginBottom: Spacing.md,
  },
  taskHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: "bold",
    flex: 1,
  },
  taskDescription: {
    fontSize: 14,
    opacity: 0.7,
  },
  emptyView: {
    padding: Spacing.xl,
    alignItems: "center",
  },
});
