<?php
/**
 * core/PersistentSession.php — Custom MySQL Session Handler for Vercel
 * 
 * Serverless Vercel tidak mendukung session file PHP standar.
 * Komponen ini memindahkan penyimpanan $_SESSION ke tabel `persistent_sessions`.
 */

class PersistentSessionHandler implements SessionHandlerInterface {
    private $db;
    private $table = 'persistent_sessions';

    public function open($savePath, $sessionName): bool {
        $this->db = getLocalDB();
        return (bool)$this->db;
    }

    public function close(): bool {
        $this->db = null;
        return true;
    }

    public function read($id): string {
        try {
            $stmt = $this->db->prepare("SELECT data FROM {$this->table} WHERE id = ? LIMIT 1");
            $stmt->execute([$id]);
            $data = $stmt->fetchColumn();
            return $data ?: '';
        } catch (Exception $e) {
            return '';
        }
    }

    public function write($id, $data): bool {
        try {
            $stmt = $this->db->prepare("REPLACE INTO {$this->table} (id, data, timestamp) VALUES (?, ?, ?)");
            return $stmt->execute([$id, $data, time()]);
        } catch (Exception $e) {
            return false;
        }
    }

    public function destroy($id): bool {
        try {
            $stmt = $this->db->prepare("DELETE FROM {$this->table} WHERE id = ?");
            return $stmt->execute([$id]);
        } catch (Exception $e) {
            return false;
        }
    }

    public function gc($maxlifetime): int|false {
        try {
            $old = time() - $maxlifetime;
            $stmt = $this->db->prepare("DELETE FROM {$this->table} WHERE timestamp < ?");
            $stmt->execute([$old]);
            return $stmt->rowCount();
        } catch (Exception $e) {
            return false;
        }
    }
}
