import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, StatusBar, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const CONTENT_HEIGHT = 56;

export default function CommonHeader({
  title,
  subtitle,
  center,
  onBack,
  left,
  right,
  backgroundColor = "#1B4D1B",
  titleColor = "#fff",
  statusBarStyle = "light-content",
  insideSafeArea = false,
  children,
}) {
  const insets = useSafeAreaInsets();
  const androidInset = StatusBar.currentHeight || 0;
  const topInset = Platform.OS === "android" ? androidInset : (insideSafeArea ? 0 : insets.top);

  return (
    <View style={[styles.container, { backgroundColor, paddingTop: topInset }]}> 
      <StatusBar
        translucent
        backgroundColor="transparent"
        barStyle={statusBarStyle}
      />
      <View style={[styles.row, { height: CONTENT_HEIGHT }]}> 
        <View style={styles.side}> 
          {left || (onBack ? (
            <TouchableOpacity onPress={onBack}>
              <Ionicons name="arrow-back" size={26} color={titleColor} />
            </TouchableOpacity>
          ) : null)}
        </View>

        <View style={styles.center}> 
          {center ? center : (
            <>
              <Text style={[styles.title, { color: titleColor }]} numberOfLines={1}>
                {title}
              </Text>
              {subtitle ? (
                <Text style={[styles.subtitle, { color: titleColor }]} numberOfLines={1}>
                  {subtitle}
                </Text>
              ) : null}
            </>
          )}
        </View>

        <View style={[styles.side, styles.sideRight]}> 
          {right || null}
        </View>
      </View>
      {children ? <View style={styles.children}>{children}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    minHeight: 100,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
  },
  side: {
    width: 44,
    justifyContent: "center",
    alignItems: "flex-start",
  },
  sideRight: {
    alignItems: "flex-end",
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
  },
  subtitle: {
    fontSize: 14,
    marginTop: 2,
    opacity: 0.9,
  },
  children: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
});
