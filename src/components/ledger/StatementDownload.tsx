"use client";

import { Document, Page, PDFDownloadLink, StyleSheet, Text, View } from "@react-pdf/renderer";
import { FileText } from "lucide-react";

import { buttonVariants } from "@/src/components/ui/button";
import type { StatementModel } from "@/src/lib/exports/statement";
import { formatMoney, makeMoney } from "@/src/lib/money";
import { cn } from "@/src/lib/utils";

const styles = StyleSheet.create({
  page: {
    padding: 36,
    fontFamily: "Helvetica",
    color: "#1f2722"
  },
  title: {
    fontSize: 22,
    marginBottom: 8
  },
  meta: {
    fontSize: 9,
    color: "#65736a",
    marginBottom: 24
  },
  section: {
    marginBottom: 18
  },
  sectionTitle: {
    fontSize: 13,
    marginBottom: 8
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderBottom: "1 solid #d9dfd2",
    paddingVertical: 6,
    gap: 12
  },
  label: {
    fontSize: 10,
    flexGrow: 1
  },
  value: {
    fontSize: 10,
    fontWeight: 700
  },
  small: {
    fontSize: 9,
    color: "#65736a"
  }
});

function memberName(uid: string, model: StatementModel) {
  return model.members.find((member) => member.uid === uid)?.displayName ?? uid;
}

function StatementDocument({ model }: { model: StatementModel }) {
  return (
    <Document title={`${model.title} statement`}>
      <Page size="LETTER" style={styles.page}>
        <Text style={styles.title}>{model.title}</Text>
        <Text style={styles.meta}>Generated {new Date(model.generatedAt).toLocaleString()}</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Net balances</Text>
          {model.totals.map((balance) => (
            <View key={balance.uid} style={styles.row}>
              <Text style={styles.label}>{memberName(balance.uid, model)}</Text>
              <Text style={styles.value}>{formatMoney(makeMoney(balance.amountMinor, balance.currency))}</Text>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Settlements</Text>
          {model.settlements.length === 0 ? (
            <Text style={styles.small}>Everyone is settled.</Text>
          ) : (
            model.settlements.map((settlement) => (
              <View key={`${settlement.fromUid}-${settlement.toUid}`} style={styles.row}>
                <Text style={styles.label}>
                  {memberName(settlement.fromUid, model)} pays {memberName(settlement.toUid, model)}
                </Text>
                <Text style={styles.value}>{formatMoney(makeMoney(settlement.amountMinor, settlement.currency))}</Text>
              </View>
            ))
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Entries</Text>
          {model.entries.map((entry) => (
            <View key={entry.id} style={styles.row}>
              <View style={{ flexGrow: 1 }}>
                <Text style={styles.label}>{entry.description}</Text>
                <Text style={styles.small}>
                  {entry.date} · {entry.type}
                </Text>
              </View>
              <Text style={styles.value}>{formatMoney(entry.amount)}</Text>
            </View>
          ))}
        </View>
      </Page>
    </Document>
  );
}

export function StatementDownload({ model }: { model: StatementModel }) {
  const fileName = `${model.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "tally"}-statement.pdf`;

  return (
    <PDFDownloadLink
      className={cn(buttonVariants({ variant: "secondary" }))}
      document={<StatementDocument model={model} />}
      fileName={fileName}
    >
      {({ loading }) => (
        <>
          <FileText className="h-4 w-4" />
          {loading ? "Preparing" : "PDF"}
        </>
      )}
    </PDFDownloadLink>
  );
}
