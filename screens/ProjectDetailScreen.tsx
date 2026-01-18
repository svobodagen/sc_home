import React, { useRef, useEffect, useState, useCallback, useMemo } from "react";
import { View, StyleSheet, ScrollView, Image, Dimensions, Platform, Pressable } from "react-native";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import PagerView from "react-native-pager-view";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "@/navigation/RootNavigator";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, Typography, BorderRadius } from "@/constants/theme";
import { useData, Project } from "@/contexts/DataContext";
import { useAuth } from "@/contexts/AuthContext";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { api } from "@/services/api";

type ProjectDetailNavigationProp = NativeStackNavigationProp<RootStackParamList, "ProjectDetail">;

interface ProjectDetailScreenProps {
  route: {
    params: {
      project: Project;
      projectIndex: number;
      isGlobal?: boolean;
      apprenticeId?: string;
      projectList?: Project[];
    };
  };
}


// Stable ProjectCard component defined outside to prevent re-mounts
const ProjectCard = React.memo(({
  proj,
  containerWidth,
  insets,
  theme,
  user,
  userData,
  allUsers,
  navigation,
}: {
  proj: Project;
  containerWidth: number;
  insets: any;
  theme: any;
  user: any;
  userData: any;
  allUsers: any[];
  navigation: any;
}) => {
  if (!proj) return <View style={{ width: containerWidth }} />;

  const author = allUsers.find(u => u.id === proj.user_id);
  const authorName = author ? author.name : "Neznámý autor";

  const isMasterView = user?.role === "Mistr";

  return (
    <ScrollView
      style={{ width: containerWidth }}
      contentContainerStyle={{
        paddingTop: Spacing.lg,
        paddingBottom: insets.bottom + 100, // Increased padding to prevent footer overlap
        paddingHorizontal: Spacing.lg,
      }}
      scrollEventThrottle={16}
    >
      {proj.image && (
        <Image
          source={{ uri: proj.image }}
          style={styles.projectImage}
        />
      )}

      <View style={styles.headerContainer}>
        <View style={styles.titleRow}>
          <ThemedText style={[styles.title, { color: theme.text }]}>
            {proj.title}
          </ThemedText>
          {proj.is_liked && (
            <MaterialCommunityIcons name="heart" size={24} color="#FF3B30" />
          )}
        </View>

        <View style={styles.metadataRow}>
          {proj.created_at && (
            <View style={styles.metadataItem}>
              <Feather name="calendar" size={14} color={theme.textSecondary} />
              <ThemedText style={[styles.metadataText, { color: theme.textSecondary }]}>
                {new Date(proj.created_at).toLocaleDateString("cs-CZ", { day: "numeric", month: "long", year: "numeric" })}
              </ThemedText>
            </View>
          )}

          <Pressable
            onPress={() => {
              if (author) {
                navigation.navigate("HostApprenticeDetail", {
                  apprenticeId: author.id,
                  apprenticeName: author.name
                });
              }
            }}
            style={styles.metadataItem}
          >
            <Feather name="user" size={14} color={isMasterView ? theme.primary : theme.textSecondary} />
            <ThemedText style={[styles.metadataText, { color: isMasterView ? theme.primary : theme.textSecondary, fontWeight: isMasterView ? "600" : "400" }]}>
              Autor: {authorName}
            </ThemedText>
          </Pressable>

          {proj.master_id && (
            <View style={styles.metadataItem}>
              <Feather name="award" size={14} color={!isMasterView ? theme.primary : theme.textSecondary} />
              <ThemedText style={[styles.metadataText, { color: !isMasterView ? theme.primary : theme.textSecondary, fontWeight: !isMasterView ? "600" : "400" }]}>
                Mistr: {allUsers.find(u => u.id === proj.master_id)?.name || "Neznámý"}
              </ThemedText>
            </View>
          )}
        </View>
      </View>

      <View style={styles.divider} />

      {proj.description && (
        <View style={styles.contentSection}>
          <ThemedText style={[styles.description, { color: theme.text }]}>
            {proj.description}
          </ThemedText>
        </View>
      )}

      {proj.master_comment && (
        <View style={[styles.masterCommentSection, { backgroundColor: theme.primary + "10" }]}>
          <View style={styles.masterCommentHeader}>
            <Feather name="message-circle" size={16} color={theme.primary} />
            <ThemedText style={[styles.masterCommentTitle, { color: theme.primary }]}>
              {allUsers.find(u => u.id === proj.master_id)?.name || "Mistr"}
            </ThemedText>
          </View>
          <ThemedText style={[styles.masterCommentText, { color: theme.text }]}>
            "{proj.master_comment}"
          </ThemedText>
        </View>
      )}
    </ScrollView>
  );
});

export default function ProjectDetailScreen({ route }: ProjectDetailScreenProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<ProjectDetailNavigationProp>();
  const { userData } = useData();
  const { user } = useAuth();

  const [localIndex, setLocalIndex] = useState(route.params.projectIndex);
  const [selectedApprenticeProjects, setSelectedApprenticeProjects] = useState<Project[]>([]);
  const [allGlobalProjects, setAllGlobalProjects] = useState<Project[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);

  useEffect(() => {
    const loadData = async () => {
      // Fetch users for everyone to resolve names
      try {
        const users = await api.getUsers();
        setAllUsers(users);
      } catch (e) {
        console.error("Error fetching users", e);
      }

      // If projectList is passed, we don't need to fetch anything
      if (route.params.projectList) return;

      // If we are in global mode, fetch all projects to enable swiping
      if (route.params.isGlobal) {
        try {
          const projs = await api.getAllProjects();
          setAllGlobalProjects(projs);
        } catch (e) {
          console.error("Error fetching global projects", e);
        }
      }

      // If we are viewing a specific apprentice
      if (route.params.apprenticeId && !route.params.isGlobal) {
        try {
          const projs = await api.getProjects(route.params.apprenticeId);
          setSelectedApprenticeProjects(projs);
        } catch (e) {
          console.error("Error fetching apprentice projects", e);
        }
      }
    };
    loadData();
  }, [route.params.isGlobal, route.params.apprenticeId, route.params.projectList]);

  const projects = useMemo(() => {
    let list: Project[] = [route.params.project];

    if (route.params.projectList) {
      list = route.params.projectList;
    } else if (route.params.isGlobal && allGlobalProjects.length > 0) {
      list = allGlobalProjects;
    } else if (route.params.apprenticeId && selectedApprenticeProjects.length > 0) {
      list = selectedApprenticeProjects;
    } else if (!route.params.isGlobal && !route.params.apprenticeId && user?.role === "Učedník") {
      list = userData.projects || [route.params.project];
    }

    return list;
  }, [user?.role, userData.projects, allGlobalProjects, selectedApprenticeProjects, route.params.project, route.params.isGlobal, route.params.apprenticeId, route.params.projectList]);

  // Robust check: Ensure the project at localIndex is actually the project we expect
  const currentProject = useMemo(() => {
    const projAtInternalIndex = projects[localIndex];
    if (projAtInternalIndex && projAtInternalIndex.id === route.params.project.id) {
      return projAtInternalIndex;
    }

    // search by ID if index is wrong or list changed
    const foundById = projects.find((p: any) => p.id === route.params.project.id);
    if (foundById) {
      const newIdx = projects.indexOf(foundById);
      if (newIdx !== -1 && newIdx !== localIndex) {
        setTimeout(() => setLocalIndex(newIdx), 0);
      }
      return foundById;
    }

    return route.params.project;
  }, [projects, localIndex, route.params.project.id]);

  // Sync route params with local state silenty for header title consistency
  useEffect(() => {
    navigation.setParams({
      project: currentProject,
      projectIndex: localIndex
    } as any);
  }, [localIndex, currentProject]);

  const screenWidth = Dimensions.get("window").width;
  const [containerWidth, setContainerWidth] = useState(screenWidth);

  const onPageSelected = (e: any) => {
    setLocalIndex(e.nativeEvent.position);
  };

  return (
    <View
      style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      onLayout={(event) => {
        const width = event.nativeEvent.layout.width;
        if (width > 0 && width !== containerWidth) {
          setContainerWidth(width);
        }
      }}
    >
      <PagerView
        style={styles.pagerView}
        initialPage={route.params.projectIndex}
        onPageSelected={onPageSelected}
      >
        {projects.map((proj: Project, index: number) => (
          <View key={proj.id || index} style={{ width: containerWidth }}>
            <ProjectCard
              proj={proj}
              containerWidth={containerWidth}
              insets={insets}
              theme={theme}
              user={user}
              userData={userData}
              allUsers={allUsers}
              navigation={navigation}
            />
          </View>
        ))}
      </PagerView>

      <View style={[styles.navigationHint, { borderTopColor: theme.border, backgroundColor: theme.backgroundDefault }]}>
        <ThemedText style={[styles.hintText, { color: theme.textSecondary }]}>
          {localIndex + 1} / {projects.length}
        </ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  pagerView: {
    flex: 1,
  },
  projectImage: {
    width: "100%",
    height: 300,
    borderRadius: 12,
    marginBottom: Spacing.md,
    resizeMode: "cover",
  },
  headerContainer: {
    marginBottom: Spacing.lg,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: Spacing.sm,
  },
  title: {
    ...Typography.title,
    flex: 1,
    marginRight: Spacing.md,
  },
  authorName: {
    ...Typography.small,
    fontWeight: "700",
    marginBottom: Spacing.xs,
  },
  metadataRow: {
    flexDirection: "column",
    gap: Spacing.sm,
  },
  metadataItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  metadataText: {
    ...Typography.small,
  },
  divider: {
    height: 1,
    backgroundColor: "rgba(150, 150, 150, 0.2)",
    marginBottom: Spacing.lg,
  },
  contentSection: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    ...Typography.h4,
    marginBottom: Spacing.sm,
  },
  description: {
    ...Typography.body,
    lineHeight: 24,
    fontStyle: "italic",
  },
  masterCommentSection: {
    marginTop: Spacing.md,
    padding: Spacing.md,
    borderRadius: 8,
    // borderLeftWidth: 4, // Removed as requested
  },
  masterCommentHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  masterCommentTitle: {
    ...Typography.body,
    fontWeight: "600",
  },
  masterCommentText: {
    ...Typography.body,
    fontStyle: "italic",
  },
  navigationHint: {
    paddingVertical: Spacing.md,
    borderTopWidth: 1,
    alignItems: "center",
  },
  hintText: {
    ...Typography.small,
  },
});
