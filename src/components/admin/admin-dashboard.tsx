"use client";

import { Fragment, useState, useTransition } from "react";

import { unlockConnectionAction } from "@/actions/admin";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type ConnectionRow = {
  id: string;
  source: string;
  wabaId: string;
  displayPhoneNumber: string;
  status: "PENDING" | "CONNECTED" | "DISCONNECTED" | "ERROR";
  createdAt: string;
  lastHeartbeatAt: string | null;
};

type AgencyRow = {
  id: string;
  name: string;
  planType: string;
  subscriptionStatus: string;
  maxConnections: number;
  connections: ConnectionRow[];
};

const STATUS_VARIANT: Record<ConnectionRow["status"], "default" | "destructive" | "secondary"> = {
  CONNECTED: "default",
  PENDING: "secondary",
  DISCONNECTED: "secondary",
  ERROR: "destructive",
};

export function AdminDashboard({ agencies }: { agencies: AgencyRow[] }) {
  const [openAgencyId, setOpenAgencyId] = useState<string | null>(null);
  const [unlockingId, setUnlockingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function handleUnlock(connectionId: string) {
    setError(null);
    setUnlockingId(connectionId);
    startTransition(async () => {
      try {
        await unlockConnectionAction(connectionId);
      } catch {
        setError("Impossibile sbloccare la licenza. Riprova.");
      } finally {
        setUnlockingId(null);
      }
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Subscribers</CardTitle>
        </CardHeader>
        <CardContent>
          {error && <p className="mb-4 text-sm text-destructive">{error}</p>}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Agenzia</TableHead>
                <TableHead>Piano</TableHead>
                <TableHead>Stato abbonamento</TableHead>
                <TableHead>Connessioni</TableHead>
                <TableHead className="text-right">Azioni</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {agencies.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                    Nessuna agenzia registrata.
                  </TableCell>
                </TableRow>
              ) : (
                agencies.map((agency) => (
                  <Fragment key={agency.id}>
                    <TableRow>
                      <TableCell className="font-medium">{agency.name}</TableCell>
                      <TableCell>{agency.planType}</TableCell>
                      <TableCell>
                        <Badge
                          variant={agency.subscriptionStatus === "ACTIVE" ? "default" : "secondary"}
                        >
                          {agency.subscriptionStatus}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {agency.connections.length} / {agency.maxConnections}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() =>
                            setOpenAgencyId((current) => (current === agency.id ? null : agency.id))
                          }
                        >
                          {openAgencyId === agency.id ? "Nascondi connessioni" : "Vedi connessioni"}
                        </Button>
                      </TableCell>
                    </TableRow>
                    {openAgencyId === agency.id && (
                      <TableRow>
                        <TableCell colSpan={5}>
                          {agency.connections.length === 0 ? (
                            <p className="text-sm text-muted-foreground">
                              Nessuna connessione per questa agenzia.
                            </p>
                          ) : (
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Origine</TableHead>
                                  <TableHead>Numero</TableHead>
                                  <TableHead>WABA ID</TableHead>
                                  <TableHead>Stato</TableHead>
                                  <TableHead>Creata il</TableHead>
                                  <TableHead className="text-right">Azioni</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {agency.connections.map((connection) => (
                                  <TableRow key={connection.id}>
                                    <TableCell>{connection.source}</TableCell>
                                    <TableCell>{connection.displayPhoneNumber}</TableCell>
                                    <TableCell>
                                      <code className="text-xs text-muted-foreground">
                                        {connection.wabaId}
                                      </code>
                                    </TableCell>
                                    <TableCell>
                                      <Badge variant={STATUS_VARIANT[connection.status]}>
                                        {connection.status}
                                      </Badge>
                                    </TableCell>
                                    <TableCell>
                                      {new Date(connection.createdAt).toLocaleDateString("it-IT")}
                                    </TableCell>
                                    <TableCell className="text-right">
                                      {(connection.status === "DISCONNECTED" ||
                                        connection.status === "ERROR") && (
                                        <Button
                                          type="button"
                                          variant="destructive"
                                          disabled={unlockingId === connection.id}
                                          onClick={() => handleUnlock(connection.id)}
                                        >
                                          {unlockingId === connection.id
                                            ? "Sblocco…"
                                            : "Libera licenza"}
                                        </Button>
                                      )}
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          )}
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
